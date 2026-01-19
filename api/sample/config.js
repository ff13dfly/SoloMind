module.exports = {
    // Default to a port not in use, e.g., 3999
    port: process.env.SAMPLE_PORT || 3999,
    debug: process.env.DEBUG === 'true',
    
    // AI 语义描述 (用于 Agent 意图识别)
    // 参考 docs/ai_format_protocol.md
    description: {
        en: {
            main: [
                "sample service for demonstration purposes",
                "use this as a template for new services",
                "do NOT use in production"
            ],
            methods: {
                "sample.echo": [
                    "echo back the input message",
                    "used for testing connectivity"
                ],
                "sample.ping": [
                    "health check endpoint",
                    "returns 'pong' if service is alive"
                ],
                "sample.category.create": [
                    "create a new category definition",
                    "reserves globally unique key in Router"
                ],
                "sample.category.delete": [
                    "soft delete a category",
                    "marks status as DELETED in Router"
                ],
                "sample.category.list": [
                    "list all categories managed by this service"
                ],
                "sample.category.item.add": [
                    "add a new item to a category tree/list"
                ]
            }
        },
        zh: {
            main: [
                "示例服务，仅供演示和模板参考",
                "请勿在生产环境中使用"
            ],
            methods: {
                "sample.echo": [
                    "回显输入的消息",
                    "用于测试连通性"
                ],
                "sample.ping": [
                    "健康检查端点",
                    "服务正常时返回 'pong'"
                ],
                "sample.category.create": [
                    "创建新的分类定义",
                    "在 Router 中预留全局唯一 Key"
                ],
                "sample.category.delete": [
                    "软删除分类",
                    "在 Router 中标记状态为 DELETED"
                ],
                "sample.category.list": [
                    "列出该服务管理的所有分类"
                ],
                "sample.category.item.add": [
                    "向分类树/列表中添加新项"
                ]
            }
        }
    },
    
    // 初始化数据种子 (Config over Hardcoding Pattern)
    // 用于 bootstrap.js 启动时自动初始化基础数据
    seeds: {
        categories: [
            /* Data Structure Example:
            {
                key: 'SAMPLE_TYPE',
                type: 'LIST', // LIST or TREE
                scope: 'LOCAL',
                desc: 'Sample Classification',
                items: [
                    { id: 'type_a', label: { zh: '类型A', en: 'Type A' } },
                    { id: 'type_b', label: { zh: '类型B', en: 'Type B' } } // ...
                ]
            }
            */
        ]
    }
};
