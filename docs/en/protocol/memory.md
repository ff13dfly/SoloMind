# Short-Term Memory Protocol (STM)

**Version**: 1.0
**Status**: Official

## 1. Overview

This protocol defines the mechanisms for managing Short-Term Memory (STM) within the client-side agent framework. The primary goal of STM is to significantly improve the **hit rate** of entity identification and intent matching by leveraging the user's immediate context.

The central premise is that user actions possess **continuity**. Entities recently accessed, created, or discussed are statistically much more likely to be the target of the next operation than random entities.

## 2. Relationship with Focus State Protocol

The **Memory Protocol** and **Focus State Protocol** work sequentially to handle user requests:

1.  **Memory Protocol (Context Provider)**:
    *   Maintains the "background" context (what user *did*, *saw*, or *said*).
    *   **Execution**: When a user request comes in, the frontend packages the current `STM Context` and sends it to the **Intent Matcher** (`agent.purpose`).
    *   **Goal**: Helps the Intent Matcher correctly identify *which* Workflow to trigger (e.g., resolving "it" to "Project A" implies the "Update Project" workflow).

2.  **Focus State Protocol (State Machine)**:
    *   **Execution**: Once a Workflow is identified (hit), the system enters the **Focus State**.
    *   **Goal**: Manages the "foreground" active task, guiding the user to complete missing parameters for that specific workflow.

**Flow Summary**:
`User Input` + `Memory Context` -> **Intent Matcher** -> `Workflow ID` -> **Focus State**

## 3. Memory Context Types

This protocol specifically manages three types of short-term memory contexts:

### 2.1. Operational Context (Search & Create)

**Definition**:
This context captures the explicit manual operations performed by the user in the UI, specifically **Searching** and **Creating** entities.

**Rationale**:
*   If a user searches for "Project Alpha", they are likely to perform an action on it immediately after.
*   If a user creates a new "Client Profile", the next instruction is very likely related to filling in details for that specific client.

**Mechanism**:
*   **Trigger**:
    *   **Search**: When a user selects a result from a search bar or list view.
    *   **Create**: When a creation form is successfully submitted and returns a new Entity ID.
*   **Storage**: Client-side LRU (Least Recently Used) cache.
*   **Structure**:
    ```json
    {
       "stuff": [
           { "id": "ACT_ID", "name": "NAME_OF_STUFF", "stamp": 1234567890 }
       ],
       "warehouse": [
           { "id": "ACT_ID", "name": "NAME_OF_WAREHOUSE", "stamp": 1234567890 }
       ]
    }
    ```
    *   **Keys (e.g., "stuff", "warehouse")**: correspond to the entity type or service domain.
    *   **`stamp`**: The timestamp of the **user's interaction** (client-side time), NOT the server-side `updatedAt`.
    *   **Backend Requirement**: Microservices do NOT need to strictly adopt this structure. They only need to return an `id` and a human-readable `name` (or title/label) so the client can map it to this format.
*   **Retention**: High priority, cleared only on explicit context switch or timeout (e.g., 5 mins).
*   **Usage**: The Agent's entity resolver looks up IDs in this cache *before* performing a global search.

### 2.2. Conversation Context (Request Continuity)

**Definition**:
This context maintains the sequential history of the user's interactions with the Agent itself (User Prompts and Agent Responses).

**Rationale**:
*   User instructions are often multi-step (e.g., "Find the report", then "Summarize it").
*   Pronouns (it, that, him) and implicit references rely entirely on the immediately preceding interaction.

**Mechanism**:
*   **Trigger**: Every message sent by the user or received from the agent.
*   **Storage**: A FIFO queue of the last N interaction pairs (e.g., last 5 turns).
*   **Usage**:
    *   **Intent Matching**: Previous intents inform the probability of the current intent (e.g., `modify` follows `find`).
    *   **Parameter Extraction**: Missing parameters in the current prompt are searched for in the previous turn's entities.

### 2.3. Correction Context (Error & Refinement)

**Definition**:
This context preserves the state of **failed**, **cancelled**, or **ambiguous** intent execution attempts.

**Rationale**:
*   If a user says "Send email to Bob" (Ambiguous: which Bob?) and then says "The one in Engineering", the second prompt is a **correction** or **refinement** of the first.
*   If an execution fails due to a missing parameter, the user's next input provides that specific missing piece, not a brand new independent command.

**Mechanism**:
*   **Trigger**:
    *   **Ambiguity**: Agent asks for clarification.
    *   **Failure**: Executor returns an error requiring user intervention.
    *   **Cancellation**: User cancels a pending confirmation card.
*   **Storage**: A "Draft Intent" slot that holds the partially filled intent object.
*   **Usage**:
    *   The next user input is treated as a **Modify/Patch** operation on the Draft Intent rather than a Create operation for a new Intent.

## 3. API Compatibility (`api/agent`)

To support these contexts (specifically **2.2 Conversation** and **2.3 Correction**), the `agent.purpose` method exposes an explicit parameter for passing formatted memory context.

### 3.1. Method Signature
```javascript
agent.purpose(prompt, memory = null)
```

### 3.2. `memory` Parameter Format
The `memory` argument expects a **formatted string** (not a raw object) that the LLM can directly consume. The frontend is responsible for formatting the `AgentContext` into this string before calling the API.

**Why String?**
*   Reduces token overhead by allowing the frontend to summarize or prune history.
*   Decouples the backend from specific frontend state structures.

**Example usage for Conversation Context (2.2):**
```javascript
// Frontend: Format conversation history
const memoryString = "User: Find documents about 'Project X'.\nAgent: I found 3 documents.";
// Call API
agent.purpose("Summarize the first one.", memoryString);
```

**Example usage for Correction Context (2.3):**
```javascript
// Frontend: Format previous intent failure
const memoryString = "Previous Intent: { type: 'send_email', missing_fields: ['recipient'] }";
// Call API
agent.purpose("Send it to Bob.", memoryString);
```

### 4.2. Intent Matcher Integration (`IntentMatcher.js`)

Existing `IntentMatcher` implements a two-phase matching process. The `memory` (STM Context) should be injected during **Phase 1** and **Phase 2** calls.

**Current (Before)**:
```javascript
// Phase 1
this.rpcCall('agent.purpose', {
    text: userInput,
    phase: 1,
    context: { services: ..., categories: ... }
});
```

**Required Update**:
1.  Extend `match(userInput)` to accept an optional `memoryContext` string.
2.  Pass this `memoryContext` to the `agent.purpose` call as the `memory` parameter (defined in Section 3.1).

**New Signature**:
```javascript
this.rpcCall('agent.purpose', {
    text: userInput,
    memory: memoryContextString, // <--- INJECTED HERE
    phase: 1,
    context: { ... }
});
```

### 4.3. System Implementation Checklist

To fully implement this protocol on the existing system, the following changes are required:

- [ ] **Frontend (Client/Mobile)**:
    - [ ] Create `useMemory` Hook:
        - [ ] Implement `OperationalContext` (LRU Cache for Search/Create IDs).
        - [ ] Implement `ConversationContext` (FIFO for Chat History).
        - [ ] Implement `CorrectionContext` (State for Draft Intents).
    - [ ] Update `useChatLogic.ts`:
        - [ ] Integrate `useMemory` to update context on user/agent messages.
        - [ ] Pass formatted memory string to `intentMatcher.match()`.
    - [ ] Update `IntentMatcher.js`:
        - [ ] Modify `match` signature to accept `memory`.
        - [ ] Pass `memory` to `agent.purpose` RPC calls.

- [ ] **Backend (API/Agent)**:
    - [ ] Verify `agent` service accepts the `memory` parameter in `purpose` method (handled by `api/agent/handlers/purpose.js` or similar). Assumed to be LLM-ready.

### 4.4. Expiration & Filtering Strategy

To maintain relevance and privacy, the frontend must implement strict expiration and filtering policies.

**Expiration (TTL)**:
*   **Operational Context**: **5 minutes**. User focus shifts quickly; searching for a file 10 minutes ago is likely irrelevant to the current task.
*   **Conversation Context**: **30 minutes** (sliding window). Conversation history remains relevant longer but should clear after a significant break.
*   **Correction Context**: **Immediate**. Cleared immediately after a successful Intent execution or explicit user cancellation.

**Filtering**:
*   **Privacy Redaction**: Automatically detect and mask sensitive patterns (e.g., Credit Card numbers, Phone numbers) in `lastSearchTerm` before storing in memory.
*   **Relevance**: Filter out generic navigation terms (e.g., "Home", "Settings", "Back") from Operational Context. Only store entity-specific interactions.
*   **Deduplication**: Operational Context (LRU) must de-duplicate IDs. If `ACT_ID_1` is accessed again, move it to the front rather than creating a duplicate entry.

## 5. Critical Analysis & Best Practices

### 5.1. Is it Worth It? (Value Assessment)
**Verdict: YES.**
*   **High ROI**: Implementation cost is moderate (frontend state only), but it solves the biggest user frustration: "Why doesn't it know what I just did?".
*   **Bridging the Gap**: Without STM, the Agent is just a CLI with NLP. With STM, it becomes a Contextual Assistant.
*   **Traffic Reduction**: Operational Context (local ID lookup) prevents unnecessary "Find X" queries to the backend.

### 5.2. Potential Risks & Mitigations

| Risk | Description | Mitigation Strategy |
|:---|:---|:---|
| **Token Overhead** | Sending full history with every request bloats costs and latency. | **Strict Pruning**: Only send last 3 operational items and last 3 message pairs. Hard limit string length (e.g., 500 chars). |
| **Context Pollution** | Old/Irrelevant context confuses the current intent (e.g., "Delete it" referring to an entity from yesterday). | **Time-To-Live (TTL)**: Aggressively retire context (e.g., 5 minutes for Operational, 10 minutes for Conversation). Clear context on explicit "Start Over". |
| **Stale Data** | Client side ID exists but was deleted on server by another user. | **Error Recovery**: If Agent uses a cached ID and backend returns 404, Agent must catch this and trigger a fresh Search automatically. |
| **Privacy** | Leaking sensitive "Search Terms" to LLM providers. | **Sanitization**: Filter out patterns like credit card numbers or passwords from the `lastSearchTerm` before adding to memory string. |

