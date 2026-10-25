---
description: Review a diff or a directory against the frontend engineering rules and report violations with file:line
argument-hint: "[staged | path | commit range]"
---
Load `~/.pi/agent/rules/frontend.md`, `~/.pi/agent/rules/engineering-invariants.md` and
`~/.pi/agent/rules/verification-checklist.md`. Then load the target repository's own rules
(`AGENTS.md`, `.agents/rules/*`): where they narrow a global rule, the repository wins.

Scope: ${1:-staged changes}. Read the actual code, not the summary of it.

## What to produce

A single table, one row per violation, newest state of the code:

| Rule | Verdict | Evidence |
|---|---|---|
| 250 LOC hard limit | FAIL | `src/pages/private/Games/components/CasinoList/index.jsx` — 633 lines |
| Layer boundary (view → service) | PASS | no service import outside `hooks/` |

Then, below the table:

1. **Gate gaps**: rules the repository claims but no command enforces. State the command that would
   enforce them. Verified example: Biome 2.2.2 has `noRestrictedImports` for the layer rule but has no
   rule for maximum lines per file, so a 250 LOC cap needs a script, not a convention.
2. **Judgement calls**: findings that no linter can decide (a component that is 90 lines but holds
   three responsibilities, a hook that owns four concerns). Give the file:line and the question the
   operator has to answer.
3. **Not assessed**: anything you could not check and why. Say so explicitly; a silently missing
   section reads as "everything was checked".

## Rules of the review

- Every verdict carries evidence: `file:line`, a count, or a command's output. No verdict from memory,
  no "generally follows the rules".
- Count, do not estimate: `wc -l`, `rg -c`, a script. If you assert 250 LOC you cite the number.
- Do not fix anything unless the user asks for fixes. This is a review.
- Do not reward a rule that is satisfied by prose. If the rule says "never inline styles" and the
  repository has no check for it, that belongs under gate gaps, not under PASS.
- If a rule is wrong for this codebase, say so and propose the amendment. Silent compliance with a
  rule that damages the project is not compliance.

## Closing line

End with the count: `N violations · M gate gaps · K judgement calls · J not assessed`. That line is
what the operator acts on.
