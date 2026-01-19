const createSampleLogic = require('./sample');
const createCategoryLogic = require('./category');

module.exports = (redis, context) => ({
    sample: createSampleLogic(redis),
    category: createCategoryLogic(redis, context)
});
