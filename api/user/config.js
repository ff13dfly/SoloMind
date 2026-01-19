require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3710,
  routerUrl: process.env.ROUTER_URL || 'http://localhost:3600',
  routerPublicKey: process.env.ROUTER_PUBLIC_KEY || 'REPLACE_WITH_ROUTER_PUBLIC_KEY',
  linkTimeout: 24 * 60 * 60 * 1000, // 24 hours
  version: '1.0.0',
  debug: process.env.DEBUG !== 'false',
  pageSize: parseInt(process.env.PAGE_SIZE) || 12,
  description: {
    en: {
        main: [
            "user authentication and identity management",
            "user profile and permission settings",
            "login, registration and session handling"
        ],
        methods: {
            "user.register": ["register new user account"],
            "user.login_request": ["initiate login challenge"],
            "user.login_verify": ["verify login signature"],
            "user.profile": ["get user profile details"],
            "user.list": ["list all users (admin)"],
            "user.get_status": ["check service status"],
            "user.update": ["update user profile/categories (admin)"],
            "user.category.create": ["create category"],
            "user.category.delete": ["delete category"],
            "user.category.list": ["list categories"],
            "user.category.get": ["get category details"],
            "user.category.item.add": ["add item to category"],
            "user.category.item.update": ["update category item"],
            "user.category.item.remove": ["remove item from category"]
        }
    },
    zh: {
        main: [
            "用户认证和身份管理",
            "用户资料和权限设置",
            "登录、注册和会话处理",
            "不处理具体的业务逻辑（如订单、会议），仅处理人"
        ],
        methods: {
            "user.register": ["注册新用户账号"],
            "user.login_request": ["发起登录挑战"],
            "user.login_verify": ["验证登录签名"],
            "user.profile": ["获取用户资料详情"],
            "user.list": ["列出所有用户（管理员）"],
            "user.get_status": ["检查服务状态"],
            "user.update": ["更新用户资料/分类（管理员）"],
            "user.category.create": ["创建分类"],
            "user.category.delete": ["删除分类"],
            "user.category.list": ["列出分类"],
            "user.category.get": ["获取分类详情"],
            "user.category.item.add": ["添加分类项"],
            "user.category.item.update": ["更新分类项"],
            "user.category.item.remove": ["移除分类项"]
        }
    }
  },
  idLengths: {
    user: 16
  },
  seeds: {
    categories: [
        {
            key: 'ROLE',
            type: 'LIST',
            scope: 'LOCAL',
            desc: 'User System Roles',
            status: 'ACTIVE',
            items: [
                {
                    id: 'normal',
                    label: { zh: '普通用户', en: 'Normal User' },
                    desc: 'Standard system user'
                },
                {
                    id: 'operator',
                    label: { zh: '运维人员', en: 'Operator' },
                    desc: 'System maintenance personnel'
                }
            ]
        }
    ]
  }
};
