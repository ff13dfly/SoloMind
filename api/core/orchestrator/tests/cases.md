# Orchestrator Service Test Definition

> **Reference**: See `docs/orchestrator_protocol.md` for data structure and API specifications.
> **Scope**: This document defines the **Test Runner Schema** and **Complex Flow Scenarios** for AI generation.
> **Framework**: **Jest** is required for all test implementations.

## 0. AI Generation Prompt

```text
Reference api/orchestrator/tests/cases.md for the test architecture and methodology.
Combine with docs/orchestrator_protocol.md for workflow data structure definitions.
Create a complete test suite for api/orchestrator including:
1. utils/generate_yaml.js (For workflow CRUD operations)
2. utils/mock_data.js (Sample workflow seeder)
3. yaml cases (unit.yaml, boundary.yaml)
4. jest scripts (unit.test.js)
```

## 1. Directory Structure

```text
api/orchestrator/tests/
├── cases.md              # This file
├── cases/                # Data-Driven Test Cases (YAML)
│   ├── unit.yaml         # CRUD and soft-delete tests
│   └── boundary.yaml     # Input validation/Constraints
├── report/               # Test Execution Reports
├── utils/                # Utilities & Generators
│   ├── generate_yaml.js  # Generator Script
│   └── mock_data.js      # Mock Data Seeder
└── scripts/              # Jest Test Suites
    └── unit.test.js      # Loads YAML cases
```

## 2. YAML Case Schema

```yaml
- id: "Unique-ID"
  method: "orchestrator.workflow.action"
  desc: "Brief description"
  depends: ["PREV-ID"]
  input:
    key: "value"
    ref: "${PREV-ID.result.id}"
  expect:
    ok: true | false
    error: "ERROR_CODE"
    assert:
      - { field: "path.to.key", equals: "value" }
      - { field: "id", match: "^[a-z0-9_]+$" }
```

## 3. Complex Flow Scenarios

### Integration (INTEG)

**INTEG-01: Workflow Lifecycle**
1. **Create**: Create workflow with valid steps
2. **Get**: Retrieve and verify all fields
3. **Update**: Modify name, add new step
4. **Delete**: Soft delete workflow
5. **List**: Verify excluded from default list
6. **Restore**: Restore and verify active

**INTEG-02: Runner Execution**
1. **Setup**: Create workflow with 2 steps referencing sample.echo
2. **Run**: Execute with input parameters
3. **Verify**: Check trace contains both step results
4. **Variable**: Confirm $step references resolved correctly

### Concurrency (CONC)

**CONC-01: Parallel Updates**
- **Action**: Concurrent updates to same workflow
- **Expect**: Last-write-wins, no data corruption

### End-to-End (E2E)

**E2E-01: Full Orchestration**
1. Create workflow referencing multiple services
2. Execute via orchestrator.run
3. Verify all steps executed in order
4. Check execution trace for success
