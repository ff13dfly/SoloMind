const methods = [
    { 
        name: 'orchestrator.workflow.create', 
        params: [
            { name: 'id', type: 'string', required: false },
            { name: 'category', type: 'object', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'desc', type: 'string', required: true },
            { name: 'steps', type: 'array', required: true },
            { name: 'priority', type: 'number', required: false },
            { name: 'tags', type: 'array', required: false },
            { name: 'examples', type: 'array', required: false },
            { name: 'negative', type: 'array', required: false },
            { name: 'required_inputs', type: 'array', required: false },
            { name: 'optional_inputs', type: 'array', required: false },
            { name: 'synonyms', type: 'object', required: false },
            { name: 'defaults', type: 'object', required: false }
        ], 
        description: 'Create a new workflow definition', 
        ai: true 
    },
    { 
        name: 'orchestrator.workflow.get', 
        params: [{ name: 'id', type: 'string', required: true }], 
        description: 'Get a workflow by ID', 
        ai: true 
    },
    { 
        name: 'orchestrator.workflow.list', 
        params: [
            { name: 'category', type: 'object', required: false },
            { name: 'includeDeleted', type: 'boolean', required: false },
            { name: 'limit', type: 'number', required: false },
            { name: 'offset', type: 'number', required: false }
        ], 
        description: 'List workflows with optional filters', 
        ai: true 
    },
    { 
        name: 'orchestrator.workflow.update', 
        params: [
            { name: 'id', type: 'string', required: true },
            { name: 'name', type: 'string', required: false },
            { name: 'desc', type: 'string', required: false },
            { name: 'category', type: 'object', required: false },
            { name: 'priority', type: 'number', required: false },
            { name: 'tags', type: 'array', required: false },
            { name: 'keywords', type: 'array', required: false },
            { name: 'examples', type: 'array', required: false },
            { name: 'negative', type: 'array', required: false },
            { name: 'required_inputs', type: 'array', required: false },
            { name: 'optional_inputs', type: 'array', required: false },
            { name: 'synonyms', type: 'object', required: false },
            { name: 'steps', type: 'array', required: false },
            { name: 'resolvers', type: 'object', required: false },
            { name: 'defaults', type: 'object', required: false }
        ], 
        description: 'Update an existing workflow', 
        ai: true 
    },
    { 
        name: 'orchestrator.workflow.delete', 
        params: [{ name: 'id', type: 'string', required: true }], 
        description: 'Soft delete a workflow', 
        ai: true 
    },
    { 
        name: 'orchestrator.workflow.restore', 
        params: [{ name: 'id', type: 'string', required: true }], 
        description: 'Restore a soft-deleted workflow', 
        ai: true 
    },
    { 
        name: 'orchestrator.workflow.build', 
        params: [], 
        description: 'Snapshot active workflows for AI recognition', 
        ai: true 
    },
    { 
        name: 'orchestrator.run', 
        params: [
            { name: 'workflowId', type: 'string', required: true },
            { name: 'input', type: 'object', required: false }
        ], 
        description: 'Execute a workflow with input parameters', 
        ai: true 
    },
    { 
        name: 'orchestrator.categories', 
        params: [], 
        description: 'List unique workflow categories', 
        ai: true 
    },
    { name: 'orchestrator.category.create', params: [], description: 'Create category', ai: true },
    { name: 'orchestrator.category.get', params: [], description: 'Get category', ai: true },
    { name: 'orchestrator.category.list', params: [], description: 'List categories', ai: true },
    { name: 'orchestrator.category.update', params: [], description: 'Update category', ai: true },
    { name: 'orchestrator.category.delete', params: [], description: 'Delete category', ai: true },
    { name: 'orchestrator.category.itemAdd', params: [], description: 'Add category item', ai: true },

    { name: 'orchestrator.category.itemUpdate', params: [], description: 'Update category item', ai: true },
    { name: 'orchestrator.category.itemRemove', params: [], description: 'Remove category item', ai: true },
    { name: 'orchestrator.workflow.getSnapshot', params: [], description: 'Get current AI capability snapshot', ai: true, public: true }
];

module.exports = methods;
