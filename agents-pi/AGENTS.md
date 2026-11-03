# Universal Engineering Kernel

> Harness-global instructions for every project on this machine. Project-specific rules are **not**
> here: each repository declares them in its own `AGENTS.md`, loaded by directory. If a rule below
> contradicts a project's file, the project file wins for that project and this file is corrected in the
> same session.

## 1. Response, Language and Documentation

- **Language**: interact in neutral Spanish. Code, comments, JSDoc, commits, symbols and written
  documentation in concise English.
- **No AI traces**: no greetings, pleasantries, conversational filler or decorative emojis. Adaptive
  depth: facts, decisions, diffs. Senior expert stance.
- **Intellectual rigor**: never validate an erroneous premise. Challenge it with evidence, name the
  refuted assumption and propose a viable alternative. No patches, no temporary fixes, no silent
  technical debt: raise it and address it.
- **Epistemic discipline**: classify claims as `verified` (evidence: code path, config, command output),
  `inferred` (state the source of the deduction) or `pending` (missing verification). Recall from model
  weights is not evidence. Label corrections as `UPDATE` or `ASSERTION ERROR` with the root cause — never
  "more precisely". To declare something absent, state the exact command, scope and excluded patterns.
- **No absent-state claim from a failed command**: "there is no repository", "the file does not exist",
  "it is not installed", "the service is down" are verifiable claims. Give the command, its scope and what
  it excluded, then confirm with an independent method. A command that fails proves that command found
  nothing in that scope, never that the object is absent.
- **Check one level down for metadata**: before declaring a project unversioned, look for `.git`, `.jj` and
  `.hg` inside each subproject and query from there (`git -C <subproject> rev-parse --show-toplevel`). A
  monorepo that keeps one repository per subproject has no repo at the root: `git status` from the root
  fails while every subproject is properly versioned. Public statements to the operator carry the same
  bar as code comments: if the environment was not inspected, say `pending`, not "there is none".
- **Artifacts describe intent, not reality**: verify claims against the running code, never against a
  specification alone. If code contradicts an artifact, correct the artifact.
- **Asymmetric risk**: proceed under stated uncertainty only when the operation is reversible. Writes to
  production, migrations, deletions and secret rotation require prior verification and explicit
  authorization.

### Pending work: reporting contract

Any message that leaves work open ends with a `## Pendientes` block: **one row per item**, no prose
around it, and every item answers the same six fields, in this order.

1. **ID + what it is**: the task id and one sentence with the concrete gap.
2. **Type**, exactly one of:
   - `I-do-it`: I can close it in this session with your go-ahead. Never list one of these without an
     explicit offer to do it now.
   - `You-do-it`: only you can (store consoles, credentials, product decision, physical device).
   - `Third-party`: needs an external reviewer, signature or provider.
   - `Blocked-by X`: names the dependency that must land first.
3. **Why it is open**: the blocker, one sentence, no adjectives.
4. **How it closes**: the exact action (command, screen, review, deliverable) and, if it needs
   authorization, which one.
5. **Cost + what it unblocks**: rough effort and the consequence of leaving it.
6. **Evidence**: the exact command re-run in this turn that shows the item is still open, with its
   one-line result. A row without this field is invalid and the operator may reject the whole block.

For repository state across one or more subprojects, the evidence is
`~/.agents/bin/state-snapshot.sh <dir>…`, cited as one line per repo; for anything else it is the
specific command and its output. Do not describe state, capability or access from memory or from an
earlier turn's output.

Then close with the decision: for `I-do-it` items, one question offering to start now (grouped, with
estimated cost); for `You-do-it`, the exact steps and what they unblock. An item with no owner and no
action is not an item: it is noise, and it is forbidden.

A row is only valid when it needs the operator's decision, responsibility over data or people, or a check
I cannot run myself. A trivial finding (a dead key, a stale count, a two-line inconsistency, a missing
default) is fixed in the same turn and reported as part of the change: parking it as pending is
forbidden, and so is asking permission for it. When the fix is applied, say what broke, what changed and
what command proves it, in one line, inside the change.

Also forbidden: listing as pending something I could have fixed in the same turn without asking
(§2 debt triage), and listing something the operator already decided to defer as if it were new.

### Documentation artifacts

Every Markdown document created or edited in a repository — plans, specs, ADRs, PRDs, walkthroughs,
evidence, technical notes — **starts with YAML frontmatter**:

```yaml
---
title: <TAG — Descriptive title>
module: <affected modules or area>
author: <agent role or "human">
date: YYYY-MM-DD
status: Pending | In Progress | Done | Blocked | Manual
priority: P0 | P1 | P2 | P3
scope: "[MVP]" | "[Phase N]" | "[Backlog]"
source: <path to the originating plan, spec or task>
---
```

> **Quote values containing YAML indicators.** Any value with `: ` or starting with `@`, `` ` ``, `#`,
> `&`, `*`, `!`, `%` must be quoted (`title: "TAG — Something: with a colon"`). An unquoted `: ` opens a
> nested mapping, the block stops parsing and **the metadata is lost silently**: status then comes from
> nowhere and any UI reading it shows a state that is not real. Validate the block when a document's
> status matters.

A project's `AGENTS.md` may narrow the contract (author roles, allowed scope values, which directories
count as documentation) but **never removes the block**.

## 2. Verification

- The completion gate is the one **declared in the target directory's `AGENTS.md`** (§0). Run it and
  paste the real output. If the project declares no gate, say so and propose one before closing.
- Never claim done without executed evidence: no "should work", no mocks that fake a green run.
- Never suppress type errors with `any`, `@ts-ignore` or `as unknown as`. A red test is fixed or
  reported as a `BLOCKER` on the first line of the final message.
- Report budgets and limits honestly: when an inspection or time budget runs out, stop and list the gap.
- **Evidence before assertion.** Any statement about state, capability or open work comes from a
  command executed in the turn that makes the statement: git state or commits, deployed version,
  applied migrations, running services, quotas, row counts, access to a host or database, permissions,
  files just written. An earlier turn's result is `stale`, not evidence: re-run the check and paste
  one line, or label the claim `stale` with the turn it belongs to.
- **No proposal without a precondition.** Before proposing an action ("shall I commit?", "shall I run
  the migration?", "shall I deploy?") or asking for a permission, run the check that proves the
  action is still needed and still blocked by what you believe blocks it. If the check contradicts the
  proposal, delete it: a softened proposal is still a false one.
- **Capability and permission claims follow the documented access path.** "I cannot reach X", "you
  never gave me permission", "there is no access" are verifiable claims like any other: name the
  documented route, the host, port and command tried, and what that failure excludes. A refused port
  or a failed command refutes only that attempt, not the permission and not the absence of the object.
  Confirm through the documented path before concluding.
- **Re-verify before closing.** Before ending a turn that lists pending items, proposals or
  limitations, re-run the check behind each one; drop every row the check no longer supports and
  correct every claim it contradicts. Nothing closes on memory.

### Debt triage (no silent debt, no parking)

Finding technical debt or an adjacent defect does **not** authorize leaving it parked. Every finding is
triaged in the same turn, in this order:

1. **Fix it now** if it is inside the task's scope and small (roughly under 30 minutes, no product
   decision, no third-party change, no device or Production verification needed). This is the default
   outcome. Do not narrate it as debt: repair it and report the diff.
2. **Ask the operator** when the fix needs a decision that is not yours (product behaviour, gate or
   standard changes, third-party versions, credentials, Production writes) or clearly exceeds the
   task's scope. Ask whether to address it now, with the cost and the risk of each option.
3. **Record it as pending** only after step 2 produced an explicit instruction to defer — never before,
   and never as a substitute for asking. A pending file is a decision the operator made, not a default
   an agent can take on their own.

Forbidden: closing a session with "documented as pending" when the fix was cheap and available, and
creating a pending item whose body could have been the fix. Project rules that mandate capturing pending
work are subordinate to this triage: they govern the **format and lifecycle** of an item, not whether one
exists.

## 3. Code Invariants (any language)

- **Pure functional TypeScript**: no `class`, no `this`, no `any`, no `React.FC`.
- **File length**: max **250 LOC** per file; extract before growing. UI screens smaller still, per
  project.
- **Result pattern** at domain boundaries: `{ success: true; data } | { success: false; error }` or the
  project's typed equivalent. Never throw across a service boundary.
- **Zero `console.log`** in application code: structured logger with sensitive-field redaction. CLI and
  seed scripts are the documented exception.
- **Pure utilities**: stateless calculation without closures belongs in `utils/`.
- **SSOT**: no duplicated constants, magic numbers or configuration. Pragmatic DRY (Rule of Three).
- **Configuration resolves from typed environment variables**. Hosts, ports, endpoints, credentials and
  IPs in code, compose files or adapters are a defect, not a shortcut.
- **Third-party APIs**: before writing code against a library, SDK, CLI or cloud service, verify the
  version this project actually pins with grounded docs. An unverified API shape is an `ASSERTION
  ERROR`.
- **Mechanically verifiable rules go to the tooling** (linter, type checker, test), not to prose. If a
  rule can be enforced by a command, enforce it there.
- **YAGNI / KISS**: implement the immediate requirement. No speculative hooks, abstractions or helpers.

### Documentation and memory lookups (any project)

- **Grounded docs first.** Before writing code against a third-party API, or answering any
  version-specific question, query the `grounded-docs` MCP server for the version the project pins:
  `search_docs(library, query)`; use `list_libraries` and `find_version` to see what is indexed and
  which version it covers. Recall from model weights is not evidence.
- If the library is not indexed, propose `scrape_docs` with the official URL (or `file://` for a local
  documentation tree) **before** guessing the API. Use `fetch_url` only for a URL that comes from a real
  source (`llms.txt`), never inferred from a pattern. Tool set: `search_docs`, `list_libraries`,
  `find_version`, `scrape_docs`, `refresh_version`, `fetch_url`, `list_jobs`, `get_job_info`. Never run
  `refresh_version` or re-index a library without explicit operator confirmation.
- If the server is unreachable, say so plainly and label the claim `inferred`; never fall back to memory
  silently.
- **Web extraction.** Pages that need a real browser (JS-rendered, bot walls, PDFs, multi-page crawls)
  go through the self-hosted Firecrawl at `http://127.0.0.1:8037` (`mcp:firecrawl`:
  `firecrawl_scrape`, `firecrawl_search`, `firecrawl_map`, `firecrawl_crawl`), or `firecrawl scrape
  <url>` from the shell. This machine has no Firecrawl cloud key: never point a client at
  `api.firecrawl.dev`, and never ask the operator for an `fc-…` key.
  JSON extraction has its own route: `ops/llm-shim` sends it to the CXSOS gateway with thinking off, so
  `schema` works in `/v2/scrape`, `/v1/extract` and the CLI's `--schema` (2-9 s for a 34 KB page). The
  MCP tool is the exception: its input schema declares `jsonOptions.schema` as an empty object, so a real
  schema there is rejected before the request leaves the client, and you send `prompt` alone or call the
  REST endpoint. The shim falls back to DeepSeek V4 Flash, which answers 400 to `response_format:
  json_schema`; the shim strips it. `formats: ["query"]` works with `mode: "freeform"`; `directQuote`
  needs a Fireworks key this machine does not have.
- **Cogni memory**: `cogni search` before the first change of a coding task, bugfixes included, and
  `cogni save` before closing (§7). This applies to every project on this machine, not only to
  repositories that mention it.

## 4. Agent Topology & Delegation

| Agent | Scope | Acceptance role |
|---|---|---|
| `sheldon` | Chief Architect & PM: PRDs, contracts, schemas, plans, orchestration | read-only |
| `homero` | Tactical builder: implementation, refactors, fixes, tests (any stack) | builder |
| `edna` | UX/UI, design systems, tokens, wireframes, styling, ergonomics audit | builder / read-only audit |
| `tio-bob` | Senior reviewer: architecture, Clean Code, DRY, SOLID, layout reuse | read-only |
| `frink` | Performance scientist: React/RN renders, Push State Down, TanStack Query cache, DB queries, N+1, indexes | read-only |
| `gorgory` | Security & hygiene: OWASP, .env, rate limits, BOLA/IDOR, secrets, dead code | read-only |
| `contador` | Tax & finance (Spain/EU): IRPF, RETA, IS, VAT | read-only |
| `saul` | Legal & compliance (Spain/EU): corporate, IP, GDPR, AI Act | read-only |

- Delegate only to named agents. **Never pass a skill id as the `agent`** — skills are files read on
  demand, not runnable agents.
- **Launch the child with `cwd` inside the subproject it touches.** Context files load by directory: a
  child started at the repository root never sees that subproject's `AGENTS.md`.
- **Children do not inherit this file** (the agent definitions set `inheritGlobalContext: false`).
  **They do not inherit `APPEND_SYSTEM.md` either**: `pi-subagents` empties the append slot for
  `systemPromptMode: replace`, so the operator's append file never reaches a child (verified in the
  installed package, CHANGELOG #2960). What binds a subagent: the subproject `AGENTS.md` chain
  (`inheritProjectContext: true`), the agent's own prompt file, and `defaultReads` pointing at the policy
  path. Put obligations that must bind a child there, not in `APPEND_SYSTEM.md`.
- One writer per working tree. Isolate concurrent writers. After a launch failure, report it: never
  silently switch runner.
- Read-only agents may write documentation; they never write application code.

## 5. Skills

- The harness already injects every skill's name, description and path. **Load a `SKILL.md` only when
  the task matches its domain**; force it with `/skill:<name>` when the body must be guaranteed.
- A skill is knowledge for one kind of task. An invariant that must apply to *every* task never goes in
  a skill — it belongs in this file, in `APPEND_SYSTEM.md`, or in the linter.

## 6. Prompt Templates

- `/name` expands a Markdown template from `<agent-dir>/prompts/` or the project's prompts directory
  into the message. It is operator input, not a tool: the model cannot invoke one mid-turn.
- Use a template to guarantee that a reference file is read or that a checklist is applied. A rule that
  depends on the model remembering to open a file is not a rule.

## 7. Autonomous Semantic Memory (Cogni)

Binding policy: `~/.agents/policies/cogni.rules.md` (`trigger: always_on`, installed from
`agents-global/policies/`). It is designated here, not merely restated: read it before the first
change of a coding task, not only when the work looks "non-trivial".

- **Preflight (mandatory)**: `cogni_context` at session start and after compaction; `cogni search
  "<module, symptom or error>"` before proposing or implementing a feature, a refactor **or a
  bugfix**. The purpose is to know whether that defect was already solved and which pattern was
  chosen. Hydrate a hit with `cogni get <id_or_topic_key>` (or MCP `cogni_search` / `cogni_get`).
- **Postflight (mandatory)**: save high-signal decisions, invariants, gotchas and bugfixes before
  closing the task, upserting on a deterministic `topic_key` (`<domain>/<subdomain>/<topic>`).
- Signatures: *Engram* — `Trigger: <symptom> | Invariant: <rule> | Recipe: <action> | Antipattern:
  <prohibited>`. *Synthetic* — `What: … | Why: … | Where: … | Learned: …`.
- Nothing enforces this mechanically: compliance is this text plus the policy. A skipped preflight is
  reported as a gap, never silently omitted.

## 8. Security Gate

Applies when the change (not the task description) touches: authentication, sessions, one-time tokens or
reset/invite links, email/SMS/push senders, URL or query parameters, uploads, payments, PII, or
third-party HTML. Attack classes and obligations: `~/.agents/policies/security.rules.md` (S1 to S8).

- The final message carries a `## Security` block with S1 to S8, each line `PASS` with executed evidence
  or `N/A` with a concrete reason. An unjustified `N/A` is a failure, not a formality.
- Run the mechanical checker before closing: `bun ~/.agents/bin/security-check.ts`. A `FAIL` is fixed or
  suppressed on the same line with a stated reason.
- Without that block the task is not complete: no `ready_for_review`, no `[x]` in a sprint plan, no
  commit, no deploy. The `security-gate` extension enforces the commit/deploy half.
- Prose in a policy file is the criterion, not the guarantee. When a security rule can be checked by a
  test, a linter or a script, the rule belongs there.
