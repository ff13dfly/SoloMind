# System Architecture

SoloMind adopts a **three-layer decoupled architecture** designed to provide a flexible and scalable private capability management platform for Super Individuals.

## Design Principles

| Principle | Description |
|-----------|-------------|
| **Privacy First** | All data stored locally, fully autonomous and controllable |
| **Three-Layer Decoupling** | Complete separation of UI, Orchestration, and Data layers |
| **AI Native** | Optimized for AI interaction at the architectural level |
| **Deterministic Execution** | AI makes decisions, workflows ensure reliable execution |
| **Stateless Design** | Compute nodes are stateless; state is fully managed by Redis, supporting horizontal scaling |
| **Architecture as Prompt** | The architecture itself is designed to be easily understood, replicated, and extended by AI |

## Three-Layer Decoupled Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Interaction Layer                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Mobile App │  │   IM Bot   │  │ Web Admin  │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│  Characteristics: Flexible presentation, replaceable skins│
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Layer 2: Orchestration Layer                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │                   Core Brain                    │    │
│  │  ┌────────┐  ┌────────┐  ┌────────────┐        │    │
│  │  │ Router │◄─►│ Agent  │  │ Orchestrator│       │    │
│  │  └────┬───┘  └────────┘  └─────┬──────┘        │    │
│  └───────┼────────────────────────┼─────────────────┘    │
│          │                        │                      │
│  ┌───────▼────────────────────────▼─────────────────┐   │
│  │              Polyglot Microservices              │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │   │
│  │  │ User │ │Asset │ │ CRM  │ │ Note │ │ ...  │  │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │   │
│  └───────────────────────────────────────────────────┘   │
│  Characteristics: Cross-language, Lego-like assembly     │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Layer 3: Data Layer                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Redis State│  │Global Search│  │ Audit Logs │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│  Characteristics: Private, high-performance, autonomous  │
└──────────────────────────────────────────────────────────┘
```

## Layer Characteristics

### Layer 1: Interaction Layer

- **Flexible Presentation**: UI layer holds no business logic
- **Replaceable**: Use Mobile App today, Telegram Bot tomorrow, same assistant
- **Dynamic Rendering (Operator Portal)**: The admin dashboard has "chameleon" characteristics, automatically generating CRUD panels based on backend `introspection`
- **Unified Protocol**: Interface can be changed anytime as long as the protocol remains consistent

### Layer 2: Orchestration Layer

- **Polyglot**: Microservices can be written in Node.js, Python, Go, etc.
- **Lego-like Assembly**: Function composition via Orchestrator
- **Dynamic Discovery**: New services are automatically perceived by AI upon registration

```
Example Workflow: Financial Entry -> Email Notification -> Auto Bookkeeping -> Payment Trigger
Composed via JSON config, no code rewriting needed
```

### Layer 3: Data Layer

- **Privatized**: Data is completely under your control
- **Shared Across Services**: Different microservices share Redis for data interoperability
- **Portable**: Export backups anytime; the system's "soul" moves with the data

## Core Components

| Component | Responsibility |
|-----------|----------------|
| **Router** | Unified API entry, permission auditing, service discovery |
| **Agent** | AI intent recognition, parameter extraction, NLU |
| **Orchestrator** | Workflow orchestration, task dispatching, step execution |
| **Microservices** | Atomic capability units, independently deployable and scalable |
| **Redis** | High-performance data storage, state management, event bus |

## Core Competitiveness

| Feature | Description |
|---------|-------------|
| **Transparency** | All business logic called transparently via JSON-RPC 2.0 |
| **Extensibility** | Feature addition based on "mounting" rather than "intrusive" modification |
| **Scalability** | Complete separation of compute and storage; microservices can be destroyed/restarted anytime without state loss |
| **Determinism** | Converting AI uncertainty into determinate business results via state machines |

## AI Native Development: Architecture as a Prompt

SoloMind is designed as **"code written for AI"**. This architecture enables external AI (like Coding Agents) to rapidly understand and extend the system:

1.  **High Cohesion Self-Introspection**: Microservices don't need external documentation. AI simply reads each service's `introspection.js` to understand the interface contract.
2.  **Few-shot Replay**: `api/sample` is provided as a standard template. AI can produce 100% compliant sub-services within minutes by mimicking the sample, without understanding the global code.
3.  **Protocol-Driven UI**: After backend defines data structures, the frontend `SummaryCard` automatically renders the UI based on returned metadata (Protocol-Driven UI).
4.  **Test as Configuration**: Discarding fragile code-level unit tests. SoloMind uses a YAML data-driven testing architecture, decoupling test cases from business logic. AI only needs to generate simple `input/expect` data pairs to verify backend logic.

> **Core Philosophy**: UI is the facade, Data is the soul, Orchestration is the glue connecting them. All of this should be accessible and out-of-the-box for AI.
