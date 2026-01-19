# Portal Operator (Business Management)

The Operator Portal is a dynamic, extensible management interface that automatically adapts to the microservices available in the system.

## Dynamic Extension Architecture

This portal implements a **Model-Driven, Extensible UI** strategy:

### 1. Dynamic Routing & Navigation
The portal does not have hardcoded routes for every service. Instead, it uses a `ServicesProvider` to fetch active services from the Router and dynamically generates:
- Sidebar navigation items.
- Breadcrumbs.
- React Router routes.

### 2. Specialized vs. Generic UIs
When a user navigates to a service (e.g., `/asset`), the system consults the `ExtensionRegistry`:
- **Specialized Theme**: If a custom UI is registered (e.g., `AssetManagement.tsx`), it is loaded to provide a rich, domain-specific experience.
- **Generic Fallback**: If no specialized UI exists, the system automatically loads the `GenericEntityPage`.

### 3. Generic Entity Management (`GenericEntityPage`)
The generic fallback uses the `entities` metadata provided by the microservices to:
- Auto-generate Tabs for each data entity.
- Render Tables with columns matched to the entity's Schema.
- Provide "Raw Data" inspection for debugging.

## How to Extend
To add a specialized UI for a new service:
1. Create your component in `src/pages/`.
2. Register it in `src/ExtensionRegistry.tsx`.
3. (Optional) Add localizations in `src/locales/`.

---
*For system-wide administration, see [portal/system](../system/README.md).*

## 🚀 Optimization Roadmap (2026-01-15)

From a React development perspective, the following dimensions are identified for future enterprise-grade enhancements:

### 1. State Management & Data Fetching
- **Recommendation**: Integrate **TanStack Query (React Query)**.
- **Benefit**: Automate request deduplication, retry logic, and window-focus refreshing. Eliminates manual `loading` state management and `useEffect` race conditions.

### 2. Form Standardization
- **Recommendation**: Transition from raw JSON editing to **JSON Schema Form** (e.g., `@rjsf/core`) or **React Hook Form**.
- **Benefit**: Provide business users with intuitive UI controls (date pickers, toggles, selects) while retaining the "Advanced Mode" JSON editor for power users.

### 3. Atomic Design & Renderer Registry
- **Recommendation**: Implement a **Renderer Registry** for `renderValue`.
- **Benefit**: Decouple display logic from `GenericList`. Allow registering specialized components for specific field types or property names (e.g., custom status badges, interactive links).

### 4. Performance at Scale
- **Recommendation**: Implement **List Virtualization** (e.g., `react-window`) for entities with large datasets.
- **Benefit**: Maintain 60fps scrolling and reduce memory footprint by only rendering rows currently visible in the viewport.

### 5. Defensive Programming
- **Recommendation**: Implement **Fine-Grained Error Boundaries** around row renderers and modals.
- **Benefit**: Prevent a single field formatting error from crashing the entire management interface.
- **Goal**: Transition from `any` types to auto-generated TypeScript interfaces synced with JSON-RPC service definitions.

### 6. Styling System Evolution
- **Recommendation**: Consider migrating from inline styles to a structured utility-first framework like **Tailwind CSS** or a CSS-in-JS solution.
- **Benefit**: Better handling of responsive design, complex pseudo-states (`:hover`, `:active`), and consistent design token application.
