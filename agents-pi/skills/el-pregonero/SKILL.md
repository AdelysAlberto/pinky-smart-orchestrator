---
name: el-pregonero
description: >-
  Telegram alerts via the Viasera notifier MCP: task completed, question pending, plan approval, permission
  required, error, with project/agent/summary fields.
---

# El Pregonero — Telegram Notification Protocol

Telegram is **strictly informational / one-way notification**. NEVER wait for or expect user replies in
Telegram.

- **Task Resolution (`TASK_COMPLETED`)**: Send a concise summary of what was resolved, implemented, or fixed.
- **Pending Questions / Approvals (`QUESTION`, `PLAN_APPROVAL`, `PERMISSION_REQUIRED`)**: Alert the user that a decision is pending. The actual question, options, or plan approval MUST ALWAYS be asked and handled directly in the active working medium (IDE chat, terminal prompt, or `ask_question`).
- **Context-Rich Parameters (Mandatory)**: Always supply full contextual metadata:
  - `project`: Specific project name and submodule (e.g. `Viasera (Backoffice)`, `Viasera (App)`, `Agents Core`).
  - `agent_role`: Platform harness + active role (e.g. `Pi (Sheldon)`, `Pi (Homero)`, `OpenCode (Edna)`).
  - `summary`: Clear context of the task being executed and the exact outcome or decision needed.
  - `action_required`: For questions/approvals, state: *"Respond in the active [Harness/IDE] chat. Telegram is notification-only."* Otherwise: *"No immediate action required."*
  - `event_type`: `'TASK_COMPLETED'` | `'QUESTION'` | `'PLAN_APPROVAL'` | `'PERMISSION_REQUIRED'` | `'ERROR'`.
