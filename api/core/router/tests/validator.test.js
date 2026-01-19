const { validateParams, isPublicMethod, PUBLIC_METHODS } = require('../handlers/validator');

describe('Validator Handler', () => {

    describe('validateParams', () => {
        test('should return null if no schema provided', () => {
            expect(validateParams({}, null)).toBeNull();
            expect(validateParams({}, [])).toBeNull();
        });

        test('should return error if required param is missing', () => {
            const schema = [{ name: 'id', type: 'string', required: true }];
            const result = validateParams({}, schema);
            
            expect(result).not.toBeNull();
            expect(result.code).toBe(-32602);
            expect(result.message).toContain("missing 'id'");
        });

        test('should return error if param has wrong type', () => {
             const schema = [{ name: 'age', type: 'number', required: true }];
             const result = validateParams({ age: 'twenty' }, schema);
             
             expect(result).not.toBeNull();
             expect(result.code).toBe(-32602);
             expect(result.message).toContain("should be number");
        });
        
        test('should validate array type correctly', () => {
             const schema = [{ name: 'tags', type: 'array' }];
             
             // Invalid
             const err = validateParams({ tags: 'string' }, schema);
             expect(err).not.toBeNull();
             expect(err.message).toContain("should be array");
             
             // Valid
             const valid = validateParams({ tags: ['a', 'b'] }, schema);
             expect(valid).toBeNull();
        });

        test('should return null if params are valid', () => {
            const schema = [
                { name: 'id', type: 'string', required: true },
                { name: 'opt', type: 'boolean' }
            ];
            const result = validateParams({ id: '123', opt: true }, schema);
            expect(result).toBeNull();
        });

        test('should ignore undefined optional params', () => {
             const schema = [{ name: 'opt', type: 'boolean' }];
             const result = validateParams({}, schema);
             expect(result).toBeNull();
        });
    });

    describe('isPublicMethod', () => {
        test('should return true for known public methods', () => {
             expect(isPublicMethod('user.login_request')).toBe(true);
             expect(isPublicMethod('system.capabilities')).toBe(true);
        });

        test('should return false for private methods', () => {
             expect(isPublicMethod('admin.deleteUser')).toBe(false);
             expect(isPublicMethod('unknown.method')).toBe(false);
        });
        
        test('should check against PUBLIC_METHODS constant', () => {
             PUBLIC_METHODS.forEach(method => {
                 expect(isPublicMethod(method)).toBe(true);
             });
        });
    });

});
