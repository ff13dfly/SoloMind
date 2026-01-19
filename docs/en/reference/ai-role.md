# AI's Role in the System

> AI is not a "chat widget" but the **core driving engine** throughout runtime and development.

## Three Roles of AI

| Role | Context | Description |
|------|---------|-------------|
| **Commander** | Runtime | Decides what to do, converts natural language to RPC |
| **Translator** | Runtime | Makes machines understand human speech |
| **Engineer** | Dev-time | Assists in code, test, and UI generation |

## Runtime: AI as System CPU

### Intent Routing

```
User: "Print last month's financial report"
  ↓ AI parses
RPC: finance.report.get + printer.print
```

- **Dependency**: 100%
- **Value**: Users don't need to memorize APIs

### Parameter Extraction

When user says "Meet with Manager Zhang next Tuesday":
- AI identifies time: "next Tuesday" → specific date
- AI identifies person: "Manager Zhang" → contact ID
- Missing params: AI asks "Where should we meet?"

### Dynamic Logic Synthesis

When no template exists:
1. AI reads `system.capabilities`
2. Assembles JSON workflow like building blocks
3. System gains "infinite extensibility"

## Dev-time: AI as Productivity Multiplier

### Adapter Generation

Traditional approach to integrating legacy ERP:
- Developer reads docs → writes code → 2 days

AI-assisted approach:
1. Feed API docs to LLM
2. Request JSON-RPC compliant adapter
3. AI generates 90% usable code
4. Human does final testing

**Efficiency boost**: 10x or more

## AI Penetration Analysis

| Layer | Traditional | SoloMind | AI Penetration |
|-------|------------|----------|:--------------:|
| **Interaction** | Mouse/Forms | Natural language | **100%** |
| **Logic** | Hardcoded if/else | Dynamic orchestration | **60%** |
| **Data** | SQL queries | Vector search/RAG | **40%** |
| **Development** | Manual coding | AI-assisted | **80%** |

## Key Design: AI is Replaceable

```
┌─────────────────────────────────────┐
│  AI Layer (Replaceable/Upgradable)  │
│  Qwen / Gemini / GPT / Local        │
└─────────────────┬───────────────────┘
                  ↓ Output: Workflow ID + Structured params
┌─────────────────┴───────────────────┐
│  Workflow Layer (Deterministic)     │
│  JSON-defined step chains           │
└─────────────────┬───────────────────┘
                  ↓ JSON-RPC calls
┌─────────────────┴───────────────────┐
│  Microservice Layer (Assets)        │
│  Stable API contracts               │
└─────────────────────────────────────┘
```

**Value**: Upgrade models without rewriting business code.
