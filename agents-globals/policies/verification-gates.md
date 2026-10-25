# Verification Gates — Operational Checklist (Reference, Not a Third Rules Authority)

**Purpose:** This is a compact execution checklist for implementers and auditors. It deliberately does not re-declare architecture or impose new patterns. The source of policy is `engineering-invariants.md` plus the domain policy loaded through project `AGENTS.md`. Use this file only if an agent benefits from a consistent pre-completion checklist; it is OPTIONAL.

## Before making changes
- [ ] Read project `AGENTS.md` and the required central policies, recording policy names/paths; report missing files.
- [ ] Identify app type, affected modules, public contracts and test strategy.
- [ ] Inspect relevant code rather than inventing paths/APIs or relying on another agent's claims.

## Verify implementation
- [ ] **Architecture:** owner/module boundaries, no improper cross-feature imports, no misplaced side effects; abstractions justified.
- [ ] **Type/correctness:** boundary validation; error/empty/loading/permission states; no unsafe type suppression; expected failures explicit.
- [ ] **Security:** no leaked secrets or sensitive payloads; authorization is server-side when relevant; appropriate storage and output encoding.
- [ ] **Performance:** no obvious redundant requests/renders, resource leaks or unbounded work. Benchmark/profile/inspect query plans for performance assertions.
- [ ] **Frontend web (if applicable):** View → Hook → Service ownership, TanStack Query keys and invalidation, local vs server state, accessibility and i18n.
- [ ] **React Native (if applicable):** safe areas, headers/navigation, lists, accessibility, dialogs, subscriptions, device/platform behavior.
- [ ] **Backend (if applicable):** response DTO/i18n contract, SQL N+1/index/race risks, Bruno/API checks and persistence boundaries.

## Evidence and final gate
- [ ] Run actual project-defined formatting/lint/typecheck and focused tests; final orchestrator runs final suite per `AGENTS.md`.
- [ ] Inspect `git diff`; note unintended changes, migration impacts and changed public contracts.
- [ ] Report each relevant check as `PASS`, `FAIL`, `NOT_RUN`, `NOT_APPLICABLE` and cite the executed command or explain the gap.
- [ ] Classify concrete violations `BLOCKER` and risks `WARNING`; document accepted tradeoffs rather than fabricating compliance.

**Do not** require class bans, file-length caps, framework packages or a fixed test command universally. If the checklist conflicts with the loaded policy, the policy governs.
