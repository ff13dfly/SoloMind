const introspection = require('../handlers/introspection');
const config = require('../config');

describe('User Service Introspection', () => {
    test('should expose all required RPC methods', () => {
        const methodNames = introspection.map(m => m.name);
        
        // Base Methods
        expect(methodNames).toContain('user.register');
        expect(methodNames).toContain('user.login_request');
        expect(methodNames).toContain('user.login_verify');
        expect(methodNames).toContain('user.profile');
        expect(methodNames).toContain('user.list');
        expect(methodNames).toContain('user.get_status');

        // Category Methods (New)
        expect(methodNames).toContain('user.category.create');
        expect(methodNames).toContain('user.category.delete');
        expect(methodNames).toContain('user.category.list');
        expect(methodNames).toContain('user.category.get');
        expect(methodNames).toContain('user.category.item.add');
        expect(methodNames).toContain('user.category.item.update');
        expect(methodNames).toContain('user.category.item.remove');
    });

    test('should have documentation for all methods in config', () => {
        const methodNames = introspection.map(m => m.name);
        const enDocs = Object.keys(config.description.en.methods);
        const zhDocs = Object.keys(config.description.zh.methods);

        methodNames.forEach(method => {
            expect(enDocs).toContain(method);
            expect(zhDocs).toContain(method);
        });
    });

    test('should have correct parameter definitions', () => {
        const itemAdd = introspection.find(m => m.name === 'user.category.item.add');
        expect(itemAdd).toBeDefined();
        expect(itemAdd.params).toEqual([
            {name: 'key', type: 'string'},
            {name: 'id', type: 'string'},
            {name: 'label', type: 'string'}
        ]);
        
        const getCat = introspection.find(m => m.name === 'user.category.get');
        expect(getCat).toBeDefined();
        expect(getCat.params).toEqual([
            {name: 'key', type: 'string'}
        ]);
    });
});
