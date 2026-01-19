# UX Design Philosophy

> **Core Goal**: Multiple endpoints, unified experience—users don't feel server switching, just an assistant that's "everywhere".

## Pain Points

Why do users hate "switching servers"?

| Pain Point | Description |
|------------|-------------|
| **State Fragmentation** | Unsure which server has which file |
| **Config Repetition** | Each server needs preference setup |
| **Cognitive Load** | Must decide "who handles this task" |

## Solutions

### Intent Routing: Automated Traffic Control

Users don't manually select servers. Client maintains **capability routing table**:

```javascript
// Routing rules example
{
  "print": "PC_Node",           // Local execution
  "organize files": "PC_Node",
  "query report": "FANG_PUB",   // Public service
  "creative drawing": "FANG_PUB"
}
```

**User Experience**:
- Always talk in the same chat box
- Backend auto-forwards across nodes
- Completely transparent

### Unified Identity: Digital Passport

**Public Key as ID**:
- Identity based on cryptography, not server accounts
- Same identity across any node

**Seamless Setup**:
- Preferences (theme, shortcuts, Agent personality) auto-sync
- Change brains, keep personality

### Global Search: Breaking Silos

**Federated Query**:
```
User searches "2024 contracts"
  ↓ Parallel requests
┌─────────────┬────────────────┐
│ Office PC   │  Home NAS      │
│ 3 results   │  5 results     │
└─────────────┴────────────────┘
  ↓ Aggregated display
Single interface, labeled sources
```

Users don't need to remember where things are.

## Rapid Simplification

### De-emphasize "Server", Emphasize "Capability"

**Traditional UI**:
```
Connected to 192.168.1.100
```

**SoloMind UI**:
```
Local execution: Ready ✓
Cloud computing: Ready ✓
```

### Offline Graceful Degradation

When local node is offline:
```
Home node is offline.
Store document in cloud and auto-print when online?
[ Store ]  [ Cancel ]
```

## Conclusion

Multi-server switching burden only exists when "users need to decide".

Through **intent routing** and **service abstraction**, complex multi-node architecture becomes:

> A distributed, high-availability **personal super assistant**—
> Users only feel the assistant is **everywhere and capable of everything**.
