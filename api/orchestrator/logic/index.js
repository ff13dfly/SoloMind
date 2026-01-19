const createWorkflowLogic = require('./workflow');
const createRunnerLogic = require('./runner');
const createCategoryLogic = require('./category');

module.exports = (redis, context) => ({
    workflow: createWorkflowLogic(redis, context),
    runner: createRunnerLogic(redis, context),
    category: createCategoryLogic(redis, context)
});
