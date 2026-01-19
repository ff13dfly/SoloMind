const config = require('../config');
const chalk = require('chalk');
const redis = require('redis');
const WorkflowManager = require('./WorkflowManager');

class CapabilityManager {
    constructor() {
        this.capabilities = [];
        this.workflows = [];
        this.lastUpdate = 0;
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes (Local memory cache)
        
        // Initialize Redis Client for this manager
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        this.redisClient.on('error', err => console.error('[Agent-CapManager] Redis Error', err));
        this.redisClient.connect().catch(console.error);
    }

    async getCapabilities(forceRefresh = false) {
        // 1. Check Memory Cache
        if (!forceRefresh && this.capabilities.length > 0 && (Date.now() - this.lastUpdate < this.CACHE_TTL)) {
            return [...this.capabilities, ...this.workflows];
        }

        console.log(chalk.blue('[Agent] Fetching capabilities from Redis...'));
        try {
            if (!this.redisClient.isOpen) await this.redisClient.connect();

            // 2. Fetch from Shared Redis Key
            const [dataStr, servicesStr, workflows] = await Promise.all([
                this.redisClient.get(config.redisCapabilityKey),
                this.redisClient.get('active_services'),
                WorkflowManager.getWorkflows(forceRefresh)
            ]);
            
            this.workflows = workflows || [];
            this.serviceDescriptions = {};

            if (servicesStr) {
                const services = JSON.parse(servicesStr);
                // Parse service-level descriptions
                Object.entries(services).forEach(([name, svc]) => {
                    if (svc.description) {
                        this.serviceDescriptions[name] = svc.description;
                    }
                });
            }

            if (dataStr) {
                const map = JSON.parse(dataStr);
                // Transform map object to array
                this.capabilities = Object.entries(map).map(([key, val]) => ({
                    name: key,
                    desc: val.desc || val.description || '',
                    params: val.params,
                    service: val.service
                }));
                this.lastUpdate = Date.now();
                console.log(chalk.green(`[Agent] Loaded ${this.capabilities.length} capabilities & ${this.workflows.length} workflows from Redis.`));
            } else {
                 console.warn(chalk.yellow('[Agent] No capabilities found in Redis (Key might be empty).'));
            }
        } catch (error) {
            console.error(chalk.red('[Agent] Failed to fetch capabilities from Redis:'), error.message);
            // Return existing cache if update fails
            if (this.capabilities.length === 0) return [];
        }

        return [...this.capabilities, ...this.workflows];
    }

    getServiceDescriptions(lang = 'en') {
        // Return a string formatted for Prompt: "- serviceName: description"
        const lines = [];
        for (const [name, descObj] of Object.entries(this.serviceDescriptions || {})) {
            const localDesc = descObj[lang] || descObj['en'];
            if (localDesc && localDesc.main) {
                lines.push(`- ${name}: ${localDesc.main.join('; ')}`);
            }
        }
        return lines.join('\n');
    }

    getMethodsForService(serviceName, lang = 'en') {
        const methods = this.capabilities.filter(c => c.service === serviceName);
        // We could also look up method-specific descriptions from `this.serviceDescriptions` if we stored them better
        // But capability map already has `desc` from introspection.
        // Let's rely on standard capability desc for now, or try to enhance it from serviceDescriptions which has the detailed map.
        
        // Actually, the `active_services` in Redis (populated by Router) contains the FULL description object for the service
        // So we can fallback to that for richer method descriptions.
        
        let enrichedMethods = methods.map(m => `- ${m.name}: ${m.desc}`).join('\n');
        
        const svcDesc = this.serviceDescriptions && this.serviceDescriptions[serviceName];
        if (svcDesc) {
            const localDesc = svcDesc[lang] || svcDesc['en'];
            if (localDesc && localDesc.methods) {
                // Return structured list from rich config
                enrichedMethods = Object.entries(localDesc.methods)
                    .map(([k, v]) => `- ${k}: ${v.join('; ')}`)
                    .join('\n');
            }
        }
        return enrichedMethods;
    }
}

module.exports = new CapabilityManager();
