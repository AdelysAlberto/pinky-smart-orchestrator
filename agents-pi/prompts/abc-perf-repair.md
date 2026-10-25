---
description: Repair a measured performance defect without changing the UI or navigation, with before/after proof
argument-hint: "[route, file, or audit report path]"
---
Load the `abc-perf-repair` skill and work under its rules.

Target: ${1:-the page, route or audit report the user names}.

## Contract

- Users see only that the page is faster. Zero visual change, zero navigation change, zero dependency
  change, unless the operator explicitly approves a specific one in this session.
- `~/.pi/agent/rules/frontend.md` and the target repository's own rules apply. Read them before the
  first edit: file length caps, layer boundaries, no new inline styles, no `any`.
- Credentials come from the operator as environment variables and are written outside the repository.

## Sequence

1. Read the audit if one exists (`artifacts/**`, a profiling export, the ticket). If it does not exist,
   measure first with the skill's `scripts/audit.mjs`, `images.mjs` and `probe.mjs` and report what you
   found before changing any code.
2. State the hypothesis and the defect's cost in numbers. One sentence, two figures.
3. List the acceptance criteria as numbers before writing the fix.
4. Fix the largest measured cost first. Smallest change that removes the cause. One concern per change.
5. Prove it: before/after from the harness, the project's gates pasted, and the visual invariance
   procedure from the skill's `references/visual-invariance.md`.

## Stop and ask when

A fix would change anything visible (artwork, placeholders, ordering, empty states), change data
freshness or polling, touch deploy configuration (cache headers, service worker scope, PWA precache,
build output), add or rename a file other code imports, require a new dependency, or be justified only
by one of two readings of the same evidence.

Present the options with their cost and your recommendation, then wait.

## Output

Per fix: the defect, the root cause with `file:line`, the change, the before/after numbers, the gate
output, and the visual comparison. No step closes without executed evidence.

If the audit documents and the code disagree, the code wins: say so and correct the document in the
same turn.
