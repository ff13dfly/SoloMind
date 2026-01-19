# Proposal Analysis: Two-Step Purpose Detection
Date: 2026-01-06
Model: Qwen-Turbo

## Hypothesis
Split purpose detection into two steps to improve accuracy:
1.  **Service Selection**: Match input to target Microservices.
2.  **Method Selection**: Match input to Methods within selected Services.

## Experiment Results

| Case | Input | Single-Step (Baseline) | Two-Step (Experimental) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Pay money... | `["finance.create"]` | `["finance.create"]` | 😐 Same |
| **2** | Visit client, spent money... | `["finance.create"]` | `["agent.chat"]` | ❌ **Worse** (Missed both) |
| **3** | New employee... | `["company.create"]` | `["agent.chat"]` | ❌ **Worse** |
| **4** | Organize meeting... | `["agenda.create"]` | `["agent.chat"]` | ❌ **Worse** |
| **5** | Book flight, notify... | `["agent.chat"]` | `["agent.chat"]` | 😐 Same (Fail) |

## Analysis
The two-step approach **reduced** effectiveness significantly (Success rate dropped from ~60% to ~20%).

### Key Issues Identified
1.  **Step 1 Bottleneck**: The specific semantic meaning often lies in the **Method Name** (e.g., `agenda.create` clearly implies "create a meeting"), whereas the **Service Name** (`agenda`) is more abstract. The model failed to link "meeting" to the abstract service "agenda" without seeing the specific method descriptions in Step 1.
2.  **Aggressive Filtering**: In Step 1, the model tended to default to "agent" (Chat) when the connection to a specific service wasn't overwhelmingly obvious. This filtered out the correct services before Step 2 could even try.
3.  **Ambiguity**: For Case 3 ("New Employee"), Step 1 actually selected `company` and `user` (which was promising!), but Step 2 still failed to pick `user.register`. This suggests that layering the prompts simply added more points of failure.

## Conclusion
**Not Effective.**
Flattened method lists (current approach) work better because the model can semantically match user input directly to the specific *action* (Method) rather than an abstract *domain* (Service).

### Recommendation
Instead of a rigid 2-step flow, consider:
1.  **Rich Descriptions**: Enhance the descriptions of the capabilities (methods) themselves in the single-step prompt.
2.  **Few-Shot Prompting**: Add examples to the single-step prompt to guide the model on complex cases (like "New Employee" -> `user.register`).
