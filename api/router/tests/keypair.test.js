const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');

jest.mock('fs');
jest.mock('path');

describe('Keypair Handler', () => {

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        
        path.join.mockImplementation((...args) => {
            const last = args[args.length - 1];
            // console.log('path.join called with:', args);
            if (last && typeof last === 'string') {
                if (last.includes('.keypair')) return '/mock/.keypair';
                if (last.includes('.password')) return '/mock/.password';
            }
            return '/mock/result';
        });

        fs.writeFileSync.mockImplementation((f, c) => {
             // console.log('fs.writeFileSync called with:', f);
        });
        fs.existsSync.mockImplementation((f) => {
             // console.log('fs.existsSync called with:', f);
             return false;
        });
    });

    test('should generate and save plaintext keypair if not exists', () => {
        const fs = require('fs'); // Re-require after resetModules
        fs.existsSync.mockReturnValue(false);
        fs.writeFileSync.mockImplementation(() => {});

        const { loadOrGenerateKeypair, getKeypair } = require('../handlers/keypair');

        loadOrGenerateKeypair(false);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('.keypair'), 
            expect.stringContaining('[')
        );
        const kp = getKeypair();
        expect(kp).toBeDefined();
    });

    test('should load existing plaintext keypair', () => {
        const fs = require('fs'); // Re-require after resetModules
        const kp = Keypair.generate();
        const secretArr = Array.from(kp.secretKey);

        fs.existsSync.mockImplementation((p) => typeof p === 'string' && p.endsWith('.keypair'));
        fs.readFileSync.mockImplementation((p) => {
             if (typeof p === 'string' && p.endsWith('.keypair')) return JSON.stringify(secretArr);
             return '';
        });

        const { loadOrGenerateKeypair, getKeypair } = require('../handlers/keypair');

        loadOrGenerateKeypair(false);

        const loaded = getKeypair();
        expect(loaded.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
    });
});
