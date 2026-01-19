require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3680,
  routerUrl: process.env.ROUTER_URL || 'http://localhost:3600',
  defaultIterations: 200000,
  challengeTtl: 60000, // 60 seconds
  debug: process.env.DEBUG !== 'false',
  
  // Redis 存储配置
  redis: {
    // 管理员用户存储 key 前缀
    // 完整 key 格式: administrator:user:{username}
    userKeyPrefix: 'administrator:user:',
    // 管理员用户列表 key
    userListKey: 'administrator:users'
  }
};
