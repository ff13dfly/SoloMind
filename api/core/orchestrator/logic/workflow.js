/**
 * Workflow CRUD Logic
 * Key: ORCHESTRATOR:WORKFLOW:{id}
 * Supports soft delete (status: ACTIVE/DELETED)
 */

const KEY_PREFIX = 'ORCHESTRATOR:WORKFLOW:';
const { generateId } = require('./utils/id_generator');
const config = require('../config');
const DistinctBuilder = require('./distinct_builder');

module.exports = (redis, { serviceName }) => ({
    /**
     * Create a new workflow
     */
    async create({ 
        id, category, priority, name, desc, 
        tags, examples, negative, keywords,
        required_inputs, optional_inputs, synonyms, 
        steps, resolvers 
    }) {
        // Auto-generate ID if missing
        if (!id) {
            id = generateId(config.idLengths.workflow || 6);
        }

        // Validation
        if (!category) throw new Error('MISSING_PARAM: category required');
        if (!name) throw new Error('MISSING_PARAM: name required');
        if (!desc) throw new Error('MISSING_PARAM: desc required');
        if (!steps || !Array.isArray(steps)) throw new Error('MISSING_PARAM: steps array required');

        // Check for duplicate
        const existingKey = `${KEY_PREFIX}${id}`;
        const existing = await redis.json.get(existingKey);
        if (existing && existing.status === 'ACTIVE') {
            throw new Error('WORKFLOW_ALREADY_EXISTS');
        }

        // Validate steps structure
        for (const step of steps) {
            if (!step.id) throw new Error('INVALID_STEP: step.id required');
            if (!step.service) throw new Error('INVALID_STEP: step.service required');
            if (!step.method) throw new Error('INVALID_STEP: step.method required');
            if (!step.params || typeof step.params !== 'object') {
                throw new Error('INVALID_STEP: step.params object required');
            }
        }

        const now = Date.now();
        const workflow = {
            id,
            category,
            priority: priority || 50,
            name,
            desc,
            tags: tags || [],
            examples: examples || [],
            negative: negative || [],
            keywords: keywords || [],
            required_inputs: required_inputs || [],
            optional_inputs: optional_inputs || [],
            synonyms: synonyms || {},
            steps,
            resolvers: resolvers || {},
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now
        };

        await redis.json.set(existingKey, '$', workflow);
        return workflow;
    },

    /**
     * Get a single workflow by ID
     */
    async get({ id }) {
        if (!id) throw new Error('MISSING_PARAM: id required');
        
        const workflow = await redis.json.get(`${KEY_PREFIX}${id}`);
        if (!workflow) throw new Error('WORKFLOW_NOT_FOUND');
        
        return workflow;
    },

    /**
     * List workflows with optional filters
     */
    async list({ category, includeDeleted = false, limit = 50, offset = 0 } = {}) {
        const keys = await redis.keys(`${KEY_PREFIX}*`);
        const workflows = [];

        for (const key of keys) {
            const workflow = await redis.json.get(key);
            if (!workflow) continue;
            
            // Filter by status
            if (!includeDeleted && workflow.status !== 'ACTIVE') continue;
            
            // Filter by category
            if (category) {
                const reqCat = typeof category === 'string' ? category : JSON.stringify(category);
                const storedCat = typeof workflow.category === 'string' ? workflow.category : JSON.stringify(workflow.category);
                if (reqCat !== storedCat) continue;
            }
            
            workflows.push(workflow);
        }

        // Sort by priority (descending), then by name
        workflows.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.name.localeCompare(b.name);
        });

        // Pagination
        const total = workflows.length;
        const paginated = workflows.slice(offset, offset + limit);

        return {
            items: paginated,
            total,
            limit,
            offset
        };
    },

    /**
     * Update workflow metadata or steps
     */
    async update({ id, name, desc, category, priority, tags, examples, negative, keywords,
                   required_inputs, optional_inputs, synonyms, steps, resolvers }) {
        if (!id) throw new Error('MISSING_PARAM: id required');

        const key = `${KEY_PREFIX}${id}`;
        const existing = await redis.json.get(key);
        if (!existing) throw new Error('WORKFLOW_NOT_FOUND');
        if (existing.status === 'DELETED') throw new Error('WORKFLOW_DELETED');

        // Apply updates
        if (name !== undefined) existing.name = name;
        if (desc !== undefined) existing.desc = desc;
        if (category !== undefined) existing.category = category;
        if (priority !== undefined) existing.priority = priority;
        if (tags !== undefined) existing.tags = tags;
        if (examples !== undefined) existing.examples = examples;
        if (negative !== undefined) existing.negative = negative;
        if (keywords !== undefined) existing.keywords = keywords;
        if (required_inputs !== undefined) existing.required_inputs = required_inputs;
        if (optional_inputs !== undefined) existing.optional_inputs = optional_inputs;
        if (synonyms !== undefined) existing.synonyms = synonyms;
        if (resolvers !== undefined) {
             // Validate resolvers: only allow read-only methods
             for (const [key, r] of Object.entries(resolvers)) {
                 if (r.method) {
                     const m = r.method.toLowerCase();
                     if (/\b(create|update|delete|remove|add|set|put|patch|reserve|restore)\b/.test(m)) {
                         throw new Error(`INVALID_RESOLVER: Method '${r.method}' is not allowed in resolvers (read-only only)`);
                     }
                 }
             }
             existing.resolvers = resolvers;
        }
        
        if (steps !== undefined) {
            // Validate steps
            if (!Array.isArray(steps)) throw new Error('INVALID_PARAM: steps must be array');
            for (const step of steps) {
                if (!step.id) throw new Error('INVALID_STEP: step.id required');
                if (!step.service) throw new Error('INVALID_STEP: step.service required');
                if (!step.method) throw new Error('INVALID_STEP: step.method required');
            }
            existing.steps = steps;
        }

        existing.updatedAt = Date.now();
        await redis.json.set(key, '$', existing);
        return existing;
    },

    /**
     * Soft delete a workflow
     */
    async delete({ id }) {
        if (!id) throw new Error('MISSING_PARAM: id required');

        const key = `${KEY_PREFIX}${id}`;
        const existing = await redis.json.get(key);
        if (!existing) throw new Error('WORKFLOW_NOT_FOUND');
        
        if (existing.status === 'DELETED') {
            return { success: true, message: 'Already deleted' };
        }

        existing.status = 'DELETED';
        existing.updatedAt = Date.now();
        existing.deletedAt = Date.now();

        await redis.json.set(key, '$', existing);
        return { success: true };
    },

    /**
     * Restore a soft-deleted workflow
     */
    async restore({ id }) {
        if (!id) throw new Error('MISSING_PARAM: id required');

        const key = `${KEY_PREFIX}${id}`;
        const existing = await redis.json.get(key);
        if (!existing) throw new Error('WORKFLOW_NOT_FOUND');
        
        if (existing.status === 'ACTIVE') {
            return { success: true, message: 'Already active' };
        }

        existing.status = 'ACTIVE';
        existing.updatedAt = Date.now();
        delete existing.deletedAt;

        await redis.json.set(key, '$', existing);
        return { success: true, workflow: existing };
    },

    /**
     * Get unique categories for two-step matching
     */
    async categories() {
        const keys = await redis.keys(`${KEY_PREFIX}*`);
        const categorySet = new Set();
        const complexCategories = [];

        for (const key of keys) {
            const workflow = await redis.json.get(key);
            if (workflow && workflow.status === 'ACTIVE' && workflow.category) {
                const val = typeof workflow.category === 'string' ? workflow.category : JSON.stringify(workflow.category);
                categorySet.add(val);
            }
        }

        return Array.from(categorySet).map(c => {
            try { return JSON.parse(c); } catch { return c; }
        }).sort((a, b) => {
             // Simple sort for strings, try-catch for objects
             const sA =  typeof a === 'string' ? a : JSON.stringify(a);
             const sB =  typeof b === 'string' ? b : JSON.stringify(b);
             return sA.localeCompare(sB);
        });
    },

    /**
     * Build a snapshot of all active workflows for Agent service
     */
    async build() {
        const workflows = await this.list({ includeDeleted: false, limit: 1000 });
        const items = workflows.items || [];
        
        // Transform to AI-optimized structure using DistinctBuilder
        const aiWorkflows = items.map(wf => ({
            id: wf.id,
            type: 'workflow',
            name: wf.name,
            desc: wf.desc,
            required_inputs: wf.required_inputs || [],
            optional_inputs: wf.optional_inputs || [],
            synonyms: wf.synonyms || {},
            examples: wf.examples || [],
            keywords: wf.keywords || [],
            tags: wf.tags || [],
            // NEW: Pre-rendered AI Metadata
            ai_meta: DistinctBuilder.buildAiMeta(wf)
        }));

        const snapshotKey = 'AGENT:WORKFLOW_SNAPSHOT';
        await redis.set(snapshotKey, JSON.stringify(aiWorkflows));
        
        console.log(`[Orchestrator] Built AI snapshot with ${aiWorkflows.length} workflows.`);
        
        return {
            success: true,
            count: aiWorkflows.length,
            key: snapshotKey,
            timestamp: Date.now()
        };
    },

    /**
     * Get the current AI capability snapshot
     */
    async getSnapshot() {
        const snapshotKey = 'AGENT:WORKFLOW_SNAPSHOT';
        const data = await redis.get(snapshotKey);
        if (!data) return { items: [], timestamp: null };
        
        try {
            const items = JSON.parse(data);
            return {
                items,
                timestamp: Date.now() // Ideally we store the build timestamp, but this works for now
            };
        } catch (e) {
            console.error('[Orchestrator] Failed to parse snapshot:', e);
            return { items: [], timestamp: null };
        }
    }
});
