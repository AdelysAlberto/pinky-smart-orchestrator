---
name: abc-perf-repair
description: >-
  Repair a measured web-performance defect without changing what the user sees: read the audit, fix the
  cause, prove before/after with Chrome DevTools Protocol. Use when a page or route is slow, renders far
  too much, blocks the main thread, or when an existing audit report has to be turned into code.
license: MIT
compatibility: pi
metadata:
  audience: senior-frontend
  domain: web-performance
  category: repair-workflow
  version: 1.0.0
---

# Performance repair without visual change

Turn a measurement into a fix, and a fix into evidence. The output of this skill is a smaller number
on the same screen, not a redesign.

## 1. When this applies

- A page or route is measurably slow and the cause is not yet known: measure first, §3.
- An audit report exists (`artifacts/**`, a profiling export, a ticket with numbers) and someone has to
  act on it: jump to §4.
- A fix is proposed and needs to be proven safe for the UI: §5 and `references/visual-invariance.md`.

It does not apply to visual redesign, to product behaviour changes, or to "make it faster" without a
number. Those need the operator, not this skill.

## 2. Non-negotiables

Read `~/.pi/agent/rules/frontend.md` and the target repository's own rules before editing. This skill
does not restate them; it assumes them. On top of those:

1. **Zero visual change** unless the operator explicitly approved a specific one. Same spacing, colour,
   type, order, copy, imagery, animation.
2. **Zero navigation change**: routes, path params, `location.state` shapes, hashes, anchor scrolling,
   guards and redirects stay byte-identical in behaviour.
3. **Zero dependency change.** Do not add, remove or upgrade a package to fix a performance defect.
4. **No threshold inflation.** Raising a timeout, a retry count, a limit or a page size to make a
   symptom disappear is not a fix. Measure the variable first.
5. **Credentials never enter the repository.** A real session is read from environment variables and
   written to a path outside the tree.
6. **One concern per change**, each with its own before/after number.

## 3. Measure before you theorise

Start the harness from `scripts/`. It needs `npx vite build` first, a static server and a Chrome with
`--remote-debugging-port=9222`. The exact sequence, what each probe answers and how to read its output
is in `references/measurement-protocol.md`.

Minimum set for any claim about a page:

```bash
node <skill>/scripts/audit.mjs desktop <label>      # requests, bytes, heap, nodes, long tasks, errors
node <skill>/scripts/images.mjs desktop             # image cost, fold split, LCP/CLS
node <skill>/scripts/probe.mjs desktop              # idle churn, animations, timer creation
```

Three habits that decide whether the measurement is worth anything:

- **Name the hypothesis before the run.** "The grid renders all rows" is testable; "the page is heavy"
  is not.
- **Read the component's own state**, not a proxy. For virtualised lists and windows,
  `scripts/virtual-window.mjs` walks the React fiber attached to a rendered node and reads the hook
  state that produced the render. That is what turns a suspicion into an arithmetic proof.
- **Separate content variance from measurement noise.** CMS-driven carousels, live scores and winners
  change between runs. Report a range and say what varies; never present one lucky run as the number.

## 4. Repair order

1. Fix in descending order of measured cost, not of aesthetic annoyance. A defect that multiplies DOM
   nodes by 40 comes before twelve micro-optimisations.
2. Prove the target state already exists somewhere. If the page self-corrects after one scroll, that
   post-correction state is your acceptance criterion, already measured.
3. Prefer the smallest change that removes the cause. Extract a function before growing a file; extract
   a hook before growing a component.
4. Leave the call site's public shape alone: same props, same DOM structure, same class names. A fix
   that needs a new prop or a new wrapper is a design change and goes through §6.

## 5. Prove it

For every fix, produce all three, pasted, not summarised:

1. **Before/after from the harness**, same device profile, same warm or cold cache setting, same
   authenticated or anonymous state.
2. **The project's own gates**: build plus linter plus type checker as the repository declares them. A
   red gate is a blocker on the first line of the report.
3. **Visual invariance**, following `references/visual-invariance.md`: screenshots at three widths for
   every route touched, plus the structural assertions that survive dynamic content.

Define acceptance as numbers before you code: "≤ 120 cards", "≤ 4,000 nodes", "windowIsNegative false",
"≤ 2 long tasks". "Feels faster" is not acceptance.

## 6. Ask, do not guess

Stop and ask the operator when a fix would:

- change anything a user can see, including placeholder artwork, empty states or ordering;
- change data freshness, polling rate or anything a third-party contract promises;
- touch deploy configuration: cache headers, service worker scope, PWA precache, build output;
- add, remove or rename a file that other code imports, or migrate a file's language;
- require a new dependency;
- be justified only by one of two plausible readings of the same evidence.

State the options, the cost of each and what you would choose. Do not pick silently.

## 7. What not to claim

- Do not claim an improvement from a single run, a warmer cache, or a different device profile.
- Do not claim "no visual change" from reading a diff. Capture the pixels.
- Do not claim a step is done when the gate output is missing, when a test is red, or when the only
  evidence is that the file compiles.
