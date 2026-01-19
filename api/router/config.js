require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3600,
  administratorServiceUrl: process.env.ADMINISTRATOR_SERVICE_URL || 'http://localhost:3680',
  defaultLanguage: 'zh',
  debug: process.env.DEBUG !== 'false', // Default to true
  bodyLimit: process.env.BODY_LIMIT || '5mb'
};
