# Purpose Detection Analysis Results
Date: 2026-01-06
Source: `api/agent/tests/purpose_detect.txt`

## Overview
This document compares the actual execution results from the **Qwen-Turbo** model against the expected analysis performed by **Gemini**.

## Comparative Analysis

| Case | Input Summary | Qwen Result (Actual) | Gemini Analysis (Expected) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | 给远景效果图公司打款2000块... | `["finance.create"]` | `["finance.create"]` | ✅ **Match** |
| **2** | 今天去拜访了无锡恒大... 花了879 | `["finance.create"]` | `["agenda.create", "finance.create"]` | ⚠️ **Partial**. Qwen missed `agenda.create` (visit record). |
| **3** | 公司新来了个员工，叫陈东 | `["company.create"]` | `["user.register"]` | ❌ **Mismatch**. Qwen selected `company.create` (Create Company entity) instead of `user.register` (New Employee). |
| **4** | 找张工... 开个会... | `["agenda.create"]` | `["agenda.create"]` | ✅ **Match** |
| **5** | 给董总预定机票... 通知财务 | `["agent.chat"]` | `["agenda.create", "notification.create"]` | ❌ **Mismatch**. Qwen failed to identify any intent and fell back to chat. |

---

## Detailed Results

### Case 1
**Input**: 
> 给远景效果图公司打款2000块，2025年的效果图费费用

**Qwen**:
```json
["finance.create"]
```
**Gemini Analysis**:
```json
["finance.create"]
```

---

### Case 2
**Input**: 
> 今天去拜访了无锡恒大开发部，和陈总沟通了下，还见到了张工、李总，一起吃了个午饭，花了879

**Qwen**:
```json
["finance.create"]
```
**Gemini Analysis**:
```json
["agenda.create", "finance.create"]
```
*Reasoning*: The input describes a visit (Agenda/Work Log) AND an expense (Finance).

---

### Case 3
**Input**: 
> 公司新来了个员工，叫陈东

**Qwen**:
```json
["company.create"]
```
**Gemini Analysis**:
```json
["user.register"]
```
*Reasoning*: "New employee" implies registering a user (`user.register`) or operator. `company.create` implies creating a new business entity, which is incorrect context.

---

### Case 4
**Input**: 
> 找张工、设计部的陈冰，还有做预算的李小晓，下午2点开个会，讨论下无锡恒大在东北塘新地块的事情

**Qwen**:
```json
["agenda.create"]
```
**Gemini Analysis**:
```json
["agenda.create"]
```
*Reasoning*: Meeting request matches `agenda.create` perfectly.

---

### Case 5
**Input**: 
> 给董总预定个下周三去北京的机票，通知下财务

**Qwen**:
```json
["agent.chat"]
```
**Gemini Analysis**:
```json
["agenda.create", "notification.create"]
```
*Reasoning*: "Booking a flight" is a schedule item (`agenda.create`). "Notify finance" is clearly `notification.create` (or `gateway.email.send`/`gateway.sms.send`).

---

## Conclusion
The **Qwen-Turbo** model (using the current prompt) tends to be conservative or single-threaded in its intent detection:
1.  **Missed Multi-Intent**: In Case 2, it only picked the money aspect, ignoring the visit log.
2.  **Context Misunderstanding**: In Case 3, it confused "Company Employee" with "Company Entity".
3.  **Conservative Fallback**: In Case 5, it failed to trigger on "Booking flight" or "Notify", defaulting to Chat.

**Recommendation**: Optimized prompt engineering or utilizing a more capable model (e.g., Qwen-Max or Gemini Pro) might be needed for complex multi-intent scenarios.
