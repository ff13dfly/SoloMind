# Portal System (Administration)

This is the system administration portal for the Fang platform. It provides a high-level overview of the system status, service health, and core capabilities.

## Key Features

### Model-Driven Overview
The "Overview" page utilizes a **Model-Driven UI** approach to display microservice capabilities and data structures:
- **Service Discovery**: Automatically lists all services registered with the Router.
- **Entity Introspection**: Shows interactive "bubbles" (popovers) for each data entity managed by a microservice. These bubbles list the fields and their data types (e.g., `userId`, `createdAt`).
- **Capability Grid**: Organizes RPC methods by service and highlights AI-enhanced capabilities.

### Implementation Details
- **Modular Component Architecture**: The `Overview` page is split into focused sub-components (`StatsCards`, `PublicMethods`, `ServiceCapabilities`, etc.) for better maintainability.
- **Dynamic Meta Updates**: Uses `system.check_service_status` to periodically refresh service metadata (methods and entities) without a full page reload.

### AI Support (Workflow Auto-Debugging)
The "AI Support" page provides an automated debugging environment for Workflows:
- **Case Generation**: Automatically creates diverse test cases (standard, colloquial, edge cases) using the `agent.cases` API.
- **Mobile Simulator**: Simulates the Focus mode experience in a mobile-frame UI, showing multi-turn parameter extraction.
- **Accuracy Reporting**: Calculates pass rates and identifies failure nodes (e.g., intent mismatch or parameter extraction failure).

## Technical Stack
- React + TypeScript + Vite
- Vanilla CSS with CSS Variables for theme consistency.
- JSON-RPC 2.0 for backend communication.

---
*For business management features, see [portal/operator](../operator/README.md).*
