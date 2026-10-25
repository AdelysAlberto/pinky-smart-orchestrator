# Universal Engineering Invariants

**Scope:** All engineering work: backend, web frontend, React Native, Go, Python, Rust, JavaScript and TypeScript. **Language and framework idioms take precedence over stylistic preferences**, never over correctness or safety.

**Policy semantics:** `MUST` / `MUST NOT` = enforceable obligations; `SHOULD` = default requiring justification when bypassed. `BLOCKER` = demonstrated correctness, security, contractual or mandatory architecture violation; `WARNING` = plausible risk that requires assessment, not automatic rejection. These are engineering policies

## 1. Work from evidence

- MUST inspect the project `AGENTS.md`, affected modules, existing contracts and conventions before changing code; MUST read the applicable policy files it identifies.
- MUST investigate relevant call paths, existing tests and dependencies before implementing a fix; avoid aimless exploration and unrelated refactors.
- MUST distinguish confirmed facts, hypotheses and measurements. Never fabricate a command result, benchmark, repository inspection or test success.
- MUST preserve observable behavior and public contracts unless a change is explicitly requested. A necessary breaking change requires a migration or coordination plan.
- MUST choose the simplest cohesive implementation meeting the requirement; do not add patterns, files, dependencies or layers for appearance.

## 2. Architecture and responsibilities

- Organize business code by capability/feature when the project uses feature-first architecture; preserve public module boundaries and prevent cycles.
- Keep domain-specific logic close to its owner. Shared helpers belong in shared code **only** when genuinely generic; purity alone does not justify moving code to `utils/`.
- MUST NOT deep-import private implementation from another business module. Use the project's documented public exports/contracts; do not impose TypeScript `index.ts` on Go, Python or Rust.
- Apply SOLID, KISS, DRY, YAGNI and separation of concerns pragmatically. Prefer composition, explicit dependencies and high cohesion; do not create an interface per implementation.
- A file over 250 LOC is a **review signal**, not a mechanical prohibition. Split only to isolate a real responsibility or improve comprehension/testability. Avoid god functions, modules and components at any size.
- Favor early returns / guard clauses to reduce nesting, but do not introduce obscure control flow or skip cleanup. Name functions and errors by behavior, not implementation accident.

## 3. Language-sensitive programming style

- **TypeScript/JavaScript:** prefer functions, closures and composition to application `class`/`this`/`new`; allow required constructors, library APIs and warranted encapsulated state. MUST NOT add explicit `any`, `@ts-ignore` or double-casts (`as unknown as`) to hide a type problem. Validate `unknown` inputs at trust boundaries. Use strict types and narrow unions.
- **Go:** idiomatic structs, functions, methods and small consumer-owned interfaces; return and wrap `error`, support `context.Context`, avoid gratuitous interfaces and panics in normal execution.
- **Python:** use functions by default when simple; classes are appropriate for meaningful state, domain models or framework conventions. Use typed exceptions for exceptional failures; add useful typing and runtime boundary validation.
- **Rust:** use ownership, explicit `Result`/`Option`, enums and trait bounds idiomatically; avoid unchecked `unwrap`/`panic` on recoverable inputs.
- Prefer immutable values where practical; mutations and side effects MUST remain explicit and appropriately scoped. Never enforce a single language's `Result` shape across all languages.

## 4. Correctness, failures and security

- Validate untrusted data where it enters the system; authorization must be enforced at each relevant protected operation, not assumed from UI or authentication alone.
- Handle expected failures explicitly and preserve diagnostic causes for unexpected failures. MUST NOT swallow errors, convert failure to apparent success, or log sensitive information.
- Protect secrets, tokens, credentials and personal data; use vetted hashing for passwords and authenticated encryption when confidentiality at rest is required. Do not invent cryptography.
- Bound network calls, resource consumption and potentially unbounded collections; propagate cancellation/timeouts when the runtime supports them.
- Treat idempotency, race conditions, cleanup and rollback as correctness concerns when the operation can be retried or run concurrently.

## 5. Performance without dogma

- Avoid redundant I/O, repeated network/database calls, uncontrolled parallelism, excessive data loading and unnecessary work in hot paths.
- Decide whether work is independent before parallelizing; `Promise.all` is **not** a concurrency limiter, cancellation mechanism or solution for transactional dependencies.
- Evaluate complexity, cardinality, caching correctness and lifecycle effects. Prefer evidence (profiling, query plans, measurements) over unverified performance claims.
- **Context review:** Backend: SQL, N+1, transactions, payload exposure. Web: render/subscription scope, effects, request/cache ownership, accessibility. React Native: list virtualization, listener cleanup, native resources, platform behavior.

## 6. Constants, dependencies and deprecated APIs

- Centralize deploy-time configuration and validate it at startup as appropriate. Keep business constants within their owning modules; not every literal is a magic number.
- Prefer existing compatible dependencies. Before adding/upgrading, inspect project version policy, compatibility, security and maintenance; latest is not automatically best.
- Avoid deprecated APIs in new code where supported alternatives exist. Do not make unrelated dependency migrations.
- Use project-native tooling: Biome/TypeScript where configured; gofmt/go vet/go test for Go; Ruff and the selected type checker/pytest for Python; cargo fmt/clippy/test for Rust.

## 7. Mandatory verification and reporting

Before marking work complete, MUST:
1. Inspect the diff for scope creep, leaked secrets, accidental changes and architecture violations.
2. Run the available *relevant* static checks and tests at the agreed project phase; perform or request integration/contract checks for behavior that mocks cannot validate.
3. Check pertinent negative paths, validation failures and regressions.
4. Report commands executed and their actual outcomes as `PASS`, `FAIL`, `NOT_RUN` or `NOT_APPLICABLE`, explaining blockers or limitations.
5. Classify findings: `BLOCKER` with concrete location/reproduction; `WARNING` with impact; `ACCEPTED` with justification.

**MUST NOT** suppress failures, weaken assertions, fabricate mocks or claim production readiness based only on a green linter. Agents may flag and escalate; automated gates enforce what can be checked mechanically.

## 8. Policy resolution

- Read `AGENTS.md` first. Project policies add precise contracts; this document supplies universal defaults.
- A project rule MAY specialize an invariant's implementation, but MUST NOT silently waive safety, correctness or truthful reporting.
- If policy files are missing/unreadable, report `BLOCKER` for code-modifying work. If rules conflict, identify the conflict and request an explicit governing decision rather than guessing.
- `AGENTS.md` references are **instructions to load** files. Each delegated agent must independently load applicable policies.
