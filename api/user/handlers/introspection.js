
module.exports = [
    { name: 'user.register', params: [{name: 'name', type: 'string'}, {name: 'email', type: 'string'}, {name: 'phone', type: 'string'}], returns: ["id", "email", "name", "username", "status"], description: 'Register new user', ai: true, public: true },
    { name: 'user.login_request', params: [{name: 'name', type: 'string'}], description: 'Step 1 of login: get challenge', ai: false, public: true },
    { name: 'user.login_verify', params: [{name: 'name', type: 'string'}, {name: 'challenge', type: 'string'}, {name: 'response', type: 'string'}, {name: 'deviceId', type: 'string'}], description: 'Step 2: verify and get token', ai: false, public: true },
    { name: 'user.profile', params: [{name: 'uid', type: 'string'}], returns: ["id", "email", "name", "username", "role", "status", "profile", "createdAt"], description: 'Get user profile', ai: true },
    { name: 'user.list', params: [], returns: ["items", "total", "page", "pageSize"], description: 'List users (Admin only)', ai: true },
    { name: 'user.get_status', params: [], description: 'Service status', ai: false },
    { name: 'user.update', params: [{name: 'uid', type: 'string'}, {name: 'categories', type: 'object'}], description: 'Update user profile/categories (Admin only)', ai: true },
    { name: 'user.permit.update', params: [{name: 'uid', type: 'string'}, {name: 'permit', type: 'object'}], description: 'Update user permissions (Admin only)', ai: true },
    { name: 'user.permit.get', params: [{name: 'uid', type: 'string'}], description: 'Get user permissions (Admin only)', ai: true },
    { name: 'user.permit.batch', params: [{name: 'permits', type: 'array'}], description: 'Batch update permissions (Admin only)', ai: true },
    { name: 'user.restore', params: [{name: 'uid', type: 'string'}], description: 'Restore deleted user', ai: false },
    { name: 'user.checkDestroyable', params: [{name: 'uid', type: 'string'}], description: 'Check if user can be permanently deleted', ai: false },
    { name: 'user.destroy', params: [{name: 'uid', type: 'string'}], description: 'Permanently delete user', ai: false },
    // Category Methods
    { name: 'user.category.create', params: [{name: 'key', type: 'string'}], description: 'Create category', ai: true },
    { name: 'user.category.delete', params: [{name: 'key', type: 'string'}], description: 'Delete category', ai: true },
    { name: 'user.category.list', params: [], returns: ["items", "total"], description: 'List categories', ai: true },
    { name: 'user.category.get', params: [{name: 'key', type: 'string'}], description: 'Get category details', ai: true },
    // Category Item Methods
    { name: 'user.category.item.add', params: [{name: 'key', type: 'string'}, {name: 'id', type: 'string'}, {name: 'label', type: 'string'}], description: 'Add item to category', ai: true },
    { name: 'user.category.item.update', params: [{name: 'key', type: 'string'}, {name: 'id', type: 'string'}], description: 'Update category item', ai: true },
    { name: 'user.category.item.remove', params: [{name: 'key', type: 'string'}, {name: 'id', type: 'string'}], description: 'Remove item from category', ai: true }
];
