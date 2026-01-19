module.exports = {
    port: process.env.ORCHESTRATOR_PORT || 3820,
    routerUrl: process.env.ROUTER_URL || 'http://localhost:3600/api/rpc',
    debug: process.env.DEBUG === 'true',
    
    // AI 语义描述 (用于 Agent 意图识别)
    description: {
        en: {
            main: [
                "workflow orchestration service for multi-service choreography",
                "defines executable workflow templates with step sequences",
                "supports variable injection ($input, $config, $step, $env)",
                "use for complex business processes spanning multiple services"
            ],
            methods: {
                "orchestrator.workflow.create": [
                    "create a new workflow definition",
                    "requires id, category, name, desc, and steps array"
                ],
                "orchestrator.workflow.get": [
                    "retrieve a single workflow by its ID"
                ],
                "orchestrator.workflow.list": [
                    "list all workflows with optional category filter",
                    "supports pagination via limit and offset"
                ],
                "orchestrator.workflow.update": [
                    "update an existing workflow's metadata or steps"
                ],
                "orchestrator.workflow.delete": [
                    "soft delete a workflow (marks as DELETED)",
                    "workflow can be restored later"
                ],
                "orchestrator.workflow.restore": [
                    "restore a soft-deleted workflow to ACTIVE status"
                ],
                "orchestrator.run": [
                    "execute a workflow with provided input parameters",
                    "returns execution trace with step results"
                ],
                "orchestrator.categories": [
                    "list all unique workflow categories",
                    "used for two-step intent matching"
                ]
            }
        },
        zh: {
            main: [
                "工作流编排服务，用于多服务流程编排",
                "定义可执行的工作流模板和步骤序列",
                "支持变量注入 ($input, $config, $step, $env)",
                "用于跨多个服务的复杂业务流程"
            ],
            methods: {
                "orchestrator.workflow.create": [
                    "创建新的工作流定义",
                    "需要 id、category、name、desc 和 steps 数组"
                ],
                "orchestrator.workflow.get": [
                    "根据 ID 获取单个工作流"
                ],
                "orchestrator.workflow.list": [
                    "列出所有工作流，可按类别筛选",
                    "支持分页 (limit/offset)"
                ],
                "orchestrator.workflow.update": [
                    "更新工作流的元数据或步骤"
                ],
                "orchestrator.workflow.delete": [
                    "软删除工作流 (标记为 DELETED)",
                    "可稍后恢复"
                ],
                "orchestrator.workflow.restore": [
                    "恢复已软删除的工作流为 ACTIVE 状态"
                ],
                "orchestrator.run": [
                    "使用提供的输入参数执行工作流",
                    "返回包含步骤结果的执行跟踪"
                ],
                "orchestrator.categories": [
                    "列出所有唯一的工作流类别",
                    "用于两步意图匹配"
                ]
            }
        }
    },

    idLengths: {
        workflow: 6
    },
    
    // 初始化数据种子
    seeds: {
        categories: [
            {
                key: 'TYPE', // Workflow Type
                type: 'LIST',
                scope: 'LOCAL',
                desc: 'Workflow Classification',
                status: 'ACTIVE',
                items: [
                    { id: 'process', label: { zh: '业务流程', en: 'Business Process' }, desc: 'Standard business operation flow' },
                    { id: 'automation', label: { zh: '自动化', en: 'Automation' }, desc: 'Background automation task' },
                    { id: 'approval', label: { zh: '审批流', en: 'Approval' }, desc: 'Human approval required' }
                ]
            }
        ]
    }
};
