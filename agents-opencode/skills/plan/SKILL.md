---
name: plan
description: Interactive technical planning and architectural blueprint drafting. Produces a molecular document set (plan/<TAG>.md, artifacts/functional_specs/<TAG>.md, artifacts/design/<TAG>.md when UI is involved), each capped at 300 lines, with PENDING status, Q&A alignment loop, and Technical Analysis & Best Practices.
---

# Interactive Technical Planning & Architecture Blueprint Skill

This skill governs the systematic deconstruction of complex tasks into an executable technical blueprint. A blueprint is **molecular**, never a single document: `plan/<TAG>.md` for orchestration (scope, gates, LINEUP, waves, dispatch, acceptance), `artifacts/functional_specs/<TAG>.md` for the technical/functional detail, and `artifacts/design/<TAG>.md` for UX/UI when the initiative touches an interface. **No document exceeds 300 lines**; if a section does not fit, extract it to `<TAG>-<domain>.md` and reference it. Technical content never lives in the orchestration plan and UX content never lives in the technical spec.

## Construction Hierarchy Metaphor
- **The Architect (`@sheldon`)**: Evaluates requirements, models system architecture, and authors the technical blueprint.
- **The Senior Worker (`@homero`)**: Executes construction across Frontend, Backend, Mobile, Go, Rust, Python, and Infrastructure with Clean Code.
- **The UI/UX Specialist (`@edna`)**: Shapes design systems, layout wireframes, tokens, and presentation components.
- **The Inspector (`@bob`)**: Performs strict read-only reviews of code diffs and verification gates.

---

## 4-Phase Execution Protocol

### Phase 1 — Discovery & Clarifying Q&A Loop
Before writing any plan:
1. Deeply inspect the workspace context, existing rules, state stores, and contracts.
2. Formulate targeted questions to resolve ambiguities, stack preferences, or edge cases.
3. If necessary, notify the user or prompt for decision alignment before committing to a plan.

### Phase 2 — Technical Analysis & Best Practices Formulation
Analyze:
- **Design Patterns**: Service-Repository, DIP adapters, Result Pattern, Screaming Architecture.
- **Modularity & LOC Limits**: Keep every view, hook, and module under 250 LOC (screens < 100 LOC).
- **Zero Deprecated APIs & SSOT**: Ensure all dependencies use current APIs and configuration lives in a single source of truth.
- **Pure Utilities**: Place pure functions in `utils/` (no closures).

### Phase 3 — Draft the blueprint set

Write to the three targets above. The orchestration plan adheres to this structure:

```markdown
---
title: <TAG — Short Descriptive Title>
module: <affected modules>
date: <YYYY-MM-DD>
status: Pending
priority: P0 | P1 | P2 | P3
scope: "[MVP]" | "[Phase N]" | "[Backlog]"
source: <originating task or artifact>
---

# PLAN: <TAG>

## 1. Technical Analysis & Recommended Best Practices
- **Architecture & Patterns:** [Vertical slicing, Result Pattern, DIP]
- **State Management & Data Fetching:** [Zustand atomic selectors, TanStack Query hooks]
- **LOC & Decoupling Audit:** [All components strictly < 250 LOC]
- **SSOT & Clean Code Invariants:** [Zero magic numbers, pure utils in utils/]

## 2. Scope & Decision Gates
- Closed decisions cite the user answer that closed them. Open ones block dependent tasks (`Blocked`), never get invented.

## 3. LINEUP
One row per task: ID, agent, objective, `DEPENDS_ON`, deliverable, validation, status.

## 4. Dispatch Waves
Mechanical ordering for the executor.

## 5. Verification Gate
```bash
bun run biome:check && bun run check && bun test
```
```

### Phase 4 — Edit Discipline (Hard Rule)

* `write` is ONLY for a document that does not exist yet.
* On an existing document, use `edit` with the smallest possible `oldText` anchor and the smallest `newText` that fixes the issue. Never regenerate a region you are not changing.
* **Rewriting an existing document in full is prohibited.** Re-emitting a 60 KB document in one pass is always the wrong answer.
* No single `edit`/`write` may emit more than ~1,500 tokens of new content. Split longer changes into successive targeted edits.
* Close decisions with the user BEFORE the first write. An open decision guarantees a full revision pass, which costs a second complete document set.
