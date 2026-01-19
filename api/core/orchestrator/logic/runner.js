/**
 * Workflow Runner - Executes workflows with variable resolution
 * Supports: $input, $config, $step, $env variable injection
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const KEY_PREFIX = 'ORCHESTRATOR:WORKFLOW:';

module.exports = (redis, { serviceName, routerUrl }) => ({
    /**
     * Execute a workflow
     * @param {string} workflowId - ID of workflow to execute
     * @param {object} input - User-provided input parameters
     */
    async run({ workflowId, input = {} }, headers = {}) {
        if (!workflowId) throw new Error('MISSING_PARAM: workflowId required');

        // 1. Load workflow
        const workflow = await redis.json.get(`${KEY_PREFIX}${workflowId}`);
        if (!workflow) throw new Error('WORKFLOW_NOT_FOUND');
        if (workflow.status === 'DELETED') throw new Error('WORKFLOW_DELETED');

        // 2. Validate required inputs
        const missingInputs = [];
        for (const reqInput of workflow.required_inputs || []) {
            if (input[reqInput] === undefined) {
                missingInputs.push(reqInput);
            }
        }
        if (missingInputs.length > 0) {
            throw new Error(`MISSING_REQUIRED_INPUTS: ${missingInputs.join(', ')}`);
        }

        // 3. Initialize context
        const context = {
            input: { ...input },
            config: { ...workflow.defaults, ...input },
            step: {},
            env: process.env
        };

        // Pre-initialize step structure in context for variables
        for (const step of workflow.steps) {
            context.step[step.id] = { params: { ...step.params }, result: null };
        }

        // 3.5 Resolve pre-execution resolvers (mapping names to IDs, etc.)
        if (workflow.resolvers && Object.keys(workflow.resolvers).length > 0) {
            console.log(`[Orchestrator] Resolving ${Object.keys(workflow.resolvers).length} pre-execution resolvers...`);
            for (const [key, resolver] of Object.entries(workflow.resolvers)) {
                console.log(`[Orchestrator] Resolver "${key}": method=${resolver.method}, source=${resolver.source}`);
                try {
                    // Resolve params for the resolver method call
                    const paramsToResolve = resolver.method_params || resolver.params;
                    console.log(`[Orchestrator] Resolver "${key}" raw params:`, JSON.stringify(paramsToResolve));
                    
                    const resolvedParams = resolveVariables(paramsToResolve, context);
                    console.log(`[Orchestrator] Resolver "${key}" resolved params:`, JSON.stringify(resolvedParams));
                    
                    const actualRpcUrl = routerUrl || process.env.ROUTER_URL || 'http://localhost:3600/api/rpc';
                    const res = await makeRpcCall(actualRpcUrl, resolver.method, resolvedParams, headers);
                    if (res.error) {
                        console.warn(`[Orchestrator] Resolver ${key} failed:`, res.error.message);
                        continue;
                    }

                    // Extract value from result path (e.g., "[0].id")
                    const value = extractPath(res.result, resolver.extract);
                    if (value !== undefined) {
                        // Map to the target source path
                        const targetPath = resolver.source.substring(1); // Remove leading $
                        setPath(context, targetPath, value);
                        console.log(`[Orchestrator] Resolver ${key} resolved to:`, value);
                        
                        // SYNC: If target is step.ID.params.VAR, also update input.VAR
                        const parts = targetPath.split('.');
                        if (parts[0] === 'step' && parts.length >= 4 && parts[2] === 'params') {
                            const varName = parts[parts.length - 1];
                            context.input[varName] = value;
                            console.log(`[Orchestrator] SYNC: Updated context.input.${varName} to:`, value);
                        }
                    }
                } catch (e) {
                    console.warn(`[Orchestrator] Resolver ${key} error:`, e.message);
                }
            }
        }

        // 4. Execute steps
        const trace = [];
        const rpcUrl = routerUrl || process.env.ROUTER_URL || 'http://localhost:3000/jsonrpc';

        for (const step of workflow.steps) {
            const stepTrace = {
                id: step.id,
                service: step.service,
                method: step.method,
                startedAt: Date.now(),
                status: 'pending'
            };

            try {
                // Check condition
                if (step.condition) {
                    const conditionMet = evaluateCondition(step.condition, context);
                    if (!conditionMet) {
                        stepTrace.status = 'skipped';
                        stepTrace.reason = 'condition not met';
                        stepTrace.endedAt = Date.now();
                        trace.push(stepTrace);
                        continue;
                    }
                }

                // Resolve variables in params
                console.log(`[Orchestrator] Context before step ${step.id} resolveVariables:`, JSON.stringify(context.step[step.id]));
                const resolvedParams = resolveVariables(step.params, context);
                console.log(`[Orchestrator] Step ${step.id} resolved params:`, JSON.stringify(resolvedParams));
                stepTrace.params = resolvedParams;

                // Execute with retry
                const maxRetries = step.retry || 0;
                let lastError = null;
                let result = null;

                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        const fullMethod = step.method.startsWith(step.service + '.') ? step.method : `${step.service}.${step.method}`;
                        result = await makeRpcCall(rpcUrl, fullMethod, resolvedParams, headers);
                        
                        if (result.error) {
                            throw new Error(result.error.message || 'Step failed');
                        }
                        
                        lastError = null; // Clear error on success
                        break; // Success
                    } catch (e) {
                        lastError = e;
                        if (attempt < maxRetries) {
                            await sleep(100 * (attempt + 1)); // Exponential backoff
                        }
                    }
                }

                if (lastError) {
                    throw lastError;
                }

                // Store result in context
                context.step[step.id] = { result: result.result };
                stepTrace.result = result.result;
                stepTrace.status = 'success';

            } catch (e) {
                stepTrace.error = e.message;
                stepTrace.status = 'failed';

                if (!step.ignore_error) {
                    stepTrace.endedAt = Date.now();
                    trace.push(stepTrace);
                    
                    return {
                        workflowId,
                        status: 'failed',
                        failedStep: step.id,
                        error: e.message,
                        trace
                    };
                }
            }

            stepTrace.endedAt = Date.now();
            trace.push(stepTrace);
        }

        return {
            workflowId,
            status: 'completed',
            trace
        };
    }
});

/**
 * Resolve $-prefixed variables in params object
 */
function resolveVariables(params, context) {
    if (params === null || params === undefined) return params;
    
    if (typeof params === 'string') {
        // Check for $ variable
        if (params.startsWith('$')) {
            return resolveVariable(params, context);
        }
        return params;
    }
    
    if (Array.isArray(params)) {
        return params.map(item => resolveVariables(item, context));
    }
    
    if (typeof params === 'object') {
        const resolved = {};
        for (const [key, value] of Object.entries(params)) {
            const resolvedValue = resolveVariables(value, context);
            // PRUNE_UNDEFINED: Only add key if value is not undefined
            if (resolvedValue !== undefined) {
                resolved[key] = resolvedValue;
            }
        }
        return resolved;
    }
    
    return params;
}

/**
 * Resolve a single $ variable
 * Supports: $input.x, $config.x, $step.stepId.result.x, $env.X
 */
function resolveVariable(variable, context) {
    const path = variable.substring(1).split('.');
    const source = path[0];
    
    if (!['input', 'config', 'step', 'env'].includes(source)) {
        // Fallback for direct property access if source is not one of the main ones
        return undefined;
    }
    
    let value = context[source];
    for (let i = 1; i < path.length && value !== undefined; i++) {
        value = value[path[i]];
    }
    
    // DEBUG: log resolution
    // console.log(`[Orchestrator] resolveVariable ${variable} ->`, value);
    
    return value;
}

/**
 * Evaluate a condition expression
 * Simple implementation: supports basic comparisons
 */
function evaluateCondition(condition, context) {
    try {
        // Replace $variables with actual values
        const resolvedCondition = condition.replace(/\$[\w.]+/g, (match) => {
            const value = resolveVariable(match, context);
            return JSON.stringify(value);
        });
        
        // Safe eval using Function constructor
        return new Function(`return ${resolvedCondition}`)();
    } catch (e) {
        console.warn(`Condition evaluation failed: ${condition}`, e.message);
        return false;
    }
}

/**
 * Make JSON-RPC call to a service via Router
 */
function makeRpcCall(urlStr, method, params, sourceHeaders = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const client = url.protocol === 'https:' ? https : http;
        
        const headers = {
            'Content-Type': 'application/json',
        };

        // Passthrough Authorization
        if (sourceHeaders['authorization']) {
            headers['authorization'] = sourceHeaders['authorization'];
        }
        if (sourceHeaders['x-admin-token']) {
            headers['x-admin-token'] = sourceHeaders['x-admin-token'];
        }
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + (url.search || ''),
            method: 'POST',
            headers
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`RPC_HTTP_ERROR_${res.statusCode}: ${data}`));
                }
                
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('INVALID_JSON_RESPONSE'));
                }
            });
        });

        req.on('error', (e) => reject(e));
        
        req.write(JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
        }));
        
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract value from nested object using a path string like "data.items[0].id"
 */
function extractPath(obj, path) {
    if (!path || !obj) return obj;
    try {
        // Handle bracket notation like [0] by converting to .0
        const normalizedPath = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
        const parts = normalizedPath.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        return current;
    } catch (e) {
        return undefined;
    }
}

/**
 * Set value in nested object using a path string like "step.id.params.x"
 */
function setPath(obj, path, value) {
    if (!path) return;
    const parts = path.split('.');
    
    // Special handling for $step.ID.params.VAR to also update $input.VAR
    // This is because UI often maps input.VAR to step.params.VAR
    if (parts[0] === 'step' && parts.length >= 4 && parts[2] === 'params') {
        const varName = parts[parts.length - 1];
        if (obj.input) {
            obj.input[varName] = value;
            console.log(`[Orchestrator] Also updated context.input.${varName} to:`, value);
        }
    }

    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
