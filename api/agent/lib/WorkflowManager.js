const redis = require('redis');
const chalk = require('chalk');

class WorkflowManager {
    constructor() {
        this.workflows = [];
        this.lastUpdate = 0;
        this.CACHE_TTL = 1 * 60 * 1000; // 1 minute
        this.SNAPSHOT_KEY = 'AGENT:WORKFLOW_SNAPSHOT';
        
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        this.redisClient.on('error', err => console.error('[Agent-WorkflowManager] Redis Error', err));
        this.redisClient.connect().catch(console.error);
    }

    async getWorkflows(forceRefresh = false) {
        if (!forceRefresh && this.workflows.length > 0 && (Date.now() - this.lastUpdate < this.CACHE_TTL)) {
            return this.workflows;
        }

        console.log(chalk.blue('[Agent] Fetching workflow snapshots from Redis...'));
        try {
            if (!this.redisClient.isOpen) await this.redisClient.connect();

            const dataStr = await this.redisClient.get(this.SNAPSHOT_KEY);
            if (dataStr) {
                this.workflows = JSON.parse(dataStr);
                this.lastUpdate = Date.now();
                console.log(chalk.green(`[Agent] Loaded ${this.workflows.length} workflows from snapshot.`));
            } else {
                console.log(chalk.yellow('[Agent] No workflow snapshot found.'));
                this.workflows = [];
            }
        } catch (error) {
            console.error(chalk.red('[Agent] Failed to fetch workflow snapshot:'), error.message);
            if (this.workflows.length === 0) return [];
        }

        return this.workflows;
    }
}

module.exports = new WorkflowManager();
