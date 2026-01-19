# AI Prompt Strategy

> **Status**: In Development  
> **Version**: 1.0

This document describes how to move prompt construction logic from runtime to build-time, improving Agent response speed.

## Core Benefits

| Benefit | Description |
|---------|-------------|
| **Zero Hardcoding** | Agent contains no field mapping tables, fully data-driven |
| **Simplified Build** | Complex logic at build-time, 90% less runtime complexity |
| **Predictable Tokens** | Can pre-calculate token usage offline |

## Workflow Pre-rendering

### Core Concept

"Computation sink" strategy: Pre-generate AI-friendly descriptions when Orchestrator builds workflow snapshots. Agent only does string substitution at runtime.

### Data Structure

Add `ai_meta` object in Redis snapshot:

```json
{
  "id": "wf_123",
  "name": "Asset Audit",
  "ai_meta": {
    "intent_desc": "- [ID: wf_123] [Workflow: Asset Audit]: Count assets in specified area",
    "field_config": {
      "warehouse": "Warehouse (aka: storage, depot)",
      "section": "Section (aka: zone)",
      "count": "Count (aka: quantity)"
    }
  }
}
```

## User Context Filtering

### Dynamic Filtering

Agent filters visible capabilities based on user **roles** and **permissions**:

```javascript
const filteredWorkflows = workflows.filter(wf => 
  hasPermission(userPermissions, wf.required_permissions)
);
```

### Role-based Prompts

Inject user role into System Prompt:

| Role | Prompt Example |
|------|----------------|
| Warehouse Manager | "You are assisting a [Warehouse Manager], focus on inventory accuracy." |
| Finance Staff | "You are assisting a [Finance Staff], pay attention to amount precision." |

## Meta Capability Pre-rendering

Router aggregates all service metadata as the registration center:

```javascript
function buildCapabilityMeta(serviceName, methods, config) {
  return methods.map(method => {
    const desc = config.description?.[method.name] || method.desc;
    return `- [API: ${method.name}]: ${desc}`;
  });
}
```

## Multilingual Support

### Build-time

Generate separate snapshots for each language:

```
AGENT:WORKFLOW_SNAPSHOT:ZH  → Chinese
AGENT:WORKFLOW_SNAPSHOT:EN  → English
```

### Runtime

Read snapshot based on user language preference.

## Cache Update Triggers

| Trigger | Action |
|---------|--------|
| Workflow save/publish | Orchestrator rebuilds snapshot |
| Service startup/config reload | Router re-aggregates metadata |

## Token Counting

Use `character count / 3` as universal estimation baseline.

```json
{
  "ai_meta": {
    "intent_desc": "...",
    "intent_tokens": 45
  }
}
```
