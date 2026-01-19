# Sample Microservice Template

This service demonstrates the standard modular architecture for the Fang microservices ecosystem. It is designed to be **AI-Developer Friendly** (low token usage context) and highly maintainable.

## Structure

```
api/sample/
├── config.js           # Configuration (ports, descriptions, pageSize)
├── index.js            # Orchestrator (Startup, Routing)
├── data.md             # Data Structure Documentation (AI Reference)
├── handlers/           # Infrastructure Logic (Reusable)
│   ├── auth.js         # Authentication (Seeds, Signatures)
│   ├── bootstrap.js    # Redis Connection, Index Creation
│   └── introspection.js # JSON-RPC Method Definitions
└── logic/              # Business Logic (Domain Specific)
    ├── index.js        # Logic Factory/Aggregator
    ├── utils/
    │   ├── id_generator.js # Deterministic ID Generation
    │   └── errors.js       # Centralized Error Definitions
    ├── sample.js       # Custom Business Logic
    └── category.js     # Standard Federated Category Logic (Generic)
```

---

## Business Logic Development Guidelines

### 1. ID Generation
Use **8-character Base58** IDs for Redis-friendly storage.
**MUST**: Use the deterministic generator in `logic/utils/id_generator.js` to avoid length drift.

```javascript
// logic/utils/id_generator.js
const crypto = require('crypto');
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function generateId(length = 8) {
    if (length <= 0) return '';
    const bytes = crypto.randomBytes(length);
    let id = '';
    for (let i = 0; i < length; i++) {
        const index = bytes[i] % 58;
        id += BASE58_CHARS[index];
    }
    return id;
}

module.exports = { generateId };
```
Usage:
```javascript
const { generateId } = require('./utils/id_generator');
const id = generateId(8);
```
- Combinations: 128 trillion (58^8)
- Saves ~64% key storage vs UUID

### 2. Unified Log Storage
Use **deterministic file storage** for logs and audit trails.
**MUST**: Use the logger utility in `logic/utils/logger.js` to ensure consistent 3-level directory structure.

```javascript
// logic/utils/logger.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function insert(key, row, folder = 'logs') {
    const hash = crypto.createHash('md5').update(String(key)).digest('hex');
    const p1 = hash.substring(0, 2);
    const p2 = hash.substring(2, 4);
    const p3 = hash.substring(4, 6);
    const fileDir = path.join(folder, p1, p2, p3);
    
    if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });
    
    fs.appendFileSync(path.join(fileDir, `${hash.substring(6)}.log`), 
        (typeof row === 'string' ? row : JSON.stringify(row)) + '\n');
}

module.exports = { insert };
```
Usage:
```javascript
const logger = require('./utils/logger');
logger.insert('user_123', { action: 'login', ip: '1.2.3.4' });
// Writes to: logs/ab/83/c8/99dd...8b.log
```
- No database dependency
- Efficient file system distribution (max 65k folders)

### 3. Config over Hardcoding Pattern
**MUST**: Use `config.js` for initialization data (seeds, presets) instead of hardcoding in logic files.

```javascript
// config.js
seeds: {
    categories: [
        { key: 'ROLE', items: [...] }
    ]
}
```
- **Separation of Concern**: Logic remains pure; data remains configurable.
- **Portability**: Easier to reuse logic across services with different presets.

### 4. Data Structure Standards

| Field | Type | Constraint | Description |
|:---|:---|:---|:---|
| `id` | string | 8-char Base58 | Auto-generated |
| `name` | string | required | Name |
| `desc` | string[] | max 10 items | Description array |
| `amount` | integer | >= 0 | Quantity |
| `price` | integer | >= 0 | Unit price (cents) |
| `status` | string | ACTIVE/DELETED | Soft delete status |
| `createdAt` | integer | ms timestamp | Creation time |
| `updatedAt` | integer | ms timestamp | Update time |
| `deletedAt` | integer | ms timestamp | Deletion time |
| `deletedBy` | string | nullable | Who deleted |

### 3. Input Validation Pattern
```javascript
async add(params) {
    const { name, desc, amount, price } = params;
    if (!name) throw Errors.MISSING_PARAM('name');
    if (desc && desc.length > 10) throw Errors.INVALID_PARAM('desc max 10 items');
    if (amount !== undefined && (!Number.isInteger(amount) || amount < 0)) 
        throw Errors.INVALID_PARAM('amount must be integer >= 0');
    if (price !== undefined && (!Number.isInteger(price) || price < 0)) 
        throw Errors.INVALID_PARAM('price must be integer >= 0');
    // ...
}
```

### 4. Soft Delete + Restore Pattern
```javascript
async remove({ id, deletedBy }) {
    // Cascade check
    const children = await redis.ft.search('idx:child', `@parentId:{${id}} @status:{ACTIVE}`);
    if (children.total > 0) throw new Error('PARENT_HAS_CHILDREN');
    
    await redis.json.set(key, '$.status', 'DELETED');
    await redis.json.set(key, '$.deletedAt', Date.now());
    await redis.json.set(key, '$.deletedBy', deletedBy || null);
}

async restore({ id }) {
    await redis.json.set(key, '$.status', 'ACTIVE');
    await redis.json.set(key, '$.deletedAt', null);
    await redis.json.set(key, '$.deletedBy', null);
    await redis.json.set(key, '$.updatedAt', Date.now());
}
```

### 5. Redundant Fields for Aggregation
When entities have hierarchical relationships, store parent IDs on child for efficient aggregation:
```javascript
// Stuff knows: unitId → sectionId → warehouseId
const stuff = {
    id, unitId, sectionId, warehouseId,  // warehouseId auto-filled on relocate
    // ...
};
```
Allows direct query: `FT.SEARCH idx @warehouseId:{xxx}`

### 6. List with Pagination
```javascript
async list(params = {}) {
    const { limit = config.pageSize || 50, offset = 0, includeDeleted = false } = params;
    
    const results = await redis.ft.search('idx:xxx', query, {
        LIMIT: { from: offset, size: limit }
    });
    
    return {
        items: results.documents.map(d => d.value),
        total: results.total
    };
}
```

### 7. Config with pageSize
```javascript
// config.js
module.exports = {
    port: 3810,
    pageSize: parseInt(process.env.PAGE_SIZE) || 50,
    // ...
};
```
Pass config to logic modules that need pagination defaults.

### 8. RediSearch Index Creation (bootstrap.js)
```javascript
try {
    await redisClient.ft.info('idx:xxx');
} catch (e) {
    await redisClient.ft.create('idx:xxx', {
        '$.name': { type: 'TEXT', AS: 'name' },
        '$.status': { type: 'TAG', AS: 'status' },
        '$.price': { type: 'NUMERIC', AS: 'price' }
    }, { ON: 'JSON', PREFIX: 'PREFIX:' });
}
```

### 9. Centralized Error Definitions (Errors.js)
Keep business and protocol errors separate from `config.js`. Errors are part of the **Contract**, while Config is **Environment-specific**.

```javascript
// logic/utils/errors.js
module.exports = {
    INVALID_PARAM: (msg) => ({ code: -32602, message: msg || 'Invalid parameters' }),
    MISSING_PARAM: (name) => ({ code: -32602, message: `Missing parameter: ${name}` }),
    NOT_FOUND: (entity) => ({ code: -32002, message: `${entity} not found` }),
    // ...
};
```
Propagate `err.code` in the main JSON-RPC handler (`index.js`):
```javascript
res.json({ jsonrpc: '2.0', error: { code: err.code || -32603, message: err.message }, id });
```

---

## Portable Modules

### 1. Federated Category (logic/category.js)
- **Auto-Discovery**: Registers categories with Router
- **Portability**: Inject `serviceName` at runtime

### 2. Authentication Handler (handlers/auth.js)
- **Level 3 Security**: Router Signature Verification
- **Copy & Use**: Just update SERVICE_NAME references

---

## How to Create a New Service

1. **Copy**: `cp -r api/sample api/your-service`
2. **Configure**: Update `config.js` (port, pageSize, descriptions)
3. **Data Model**: Create `data.md` with field types and API specs
4. **Errors**: Create `logic/utils/errors.js` to define business error codes
5. **Logic**: Implement domain logic in `logic/your-domain.js`
6. **Wiring**: 
   - `logic/index.js`: Export all modules
   - `index.js`: Route RPC methods
7. **Ping Method (Required)**: Add standard health check endpoint:
   ```javascript
   // In index.js JSON-RPC routing, add before 'methods' handler:
   else if (method === 'ping') {
       result = { status: 'ok', service: SERVICE_NAME, version: SERVICE_VERSION, uptime: STARTUP_TIME };
   }
   ```
   > **Note**: Router uses `ping` for health checks. Services without it show as ERROR in registry.
8. **Bootstrap**: 
   - Add RediSearch indexes creation
   - Add `ensureDefaultCategories` call for config-based seeds
   ```javascript
   await ensureDefaultCategories(redisClient, SERVICE_NAME);
   ```
9. **Introspection Sync (CRITICAL)**:
   You **MUST** keep `handlers/introspection.js` updated whenever you change logic code.
   - **params**: Must match `logic/*.js` input validation.
   - **returns**: Must list the fields returned by the method (e.g. `['id', 'name']`).
   > *Failure to sync will cause workflow editor and AI agents to generate incorrect calls.*

### 10. Complex Object Parameters
For methods that update multiple fields via a single object parameter (e.g. `updates`), you **MUST** provide a `fields` array in the introspection definition. This allows the AI to understand what's inside the object and enables the Frontend to render a proper form.

```javascript
{ 
    name: 'sample.update', 
    params: [
        { name:'id', type:'string', required:true }, 
        {
            name:'updates', 
            type:'object',
            description: 'Fields to update',
            // CRITICAL: Define sub-fields here
            fields: [
                { name: 'name', type: 'string', description: 'Item Name' },
                { name: 'status', type: 'string', description: 'Status' }
            ]
        }
    ], 
    description: 'Update sample item', 
    ai: true 
}
```

---

## Running

> **Note**: This project uses **yarn** as the package manager. Please use `yarn` instead of `npm`.

```bash
yarn install
yarn start
```
