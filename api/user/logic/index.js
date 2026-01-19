const createUserLogic = require('./user');
const createCategoryLogic = require('./category');

module.exports = (redis, config, context) => ({
    user: createUserLogic(redis, config, context),
    category: createCategoryLogic(redis, context)
});
