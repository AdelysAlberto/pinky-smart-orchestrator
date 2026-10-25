# Backend — Project Agent Contract (Pi)

> This is the **only policy entrypoint stored in this backend project**. The canonical engineering
> policies live in the agent home, not in a project-local `rules/` directory. Pi loads `AGENTS.md`
> as context; references below are **not automatically expanded**. Every executing/delegated agent
> MUST read the contents of the required files before relevant work.
>
> This file retains backend-specific **existing project contracts and commands**. It complements
> the workspace `../AGENTS.md` (if present) and the API/i18n/infra specifications listed below.
> If a documented convention contradicts actual code, inspect and report the discrepancy;
> do NOT assume the code automatically overrides a security or correctness requirement.

## 0. Mandatory Policy Preflight (blocking before code edits)

**Canonical policy directory:** `${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}/policies/`

1. Read **`engineering-invariants.md`** from that directory for every engineering task.
2. Read **`backend.rules.md`** for backend/API/job/DB tasks (this repository).
3. Read this project `AGENTS.md`, plus the relevant workspace contract (`../AGENTS.md`) if available.
4. Inspect affected code and project contract documents; resolve which of the policies apply.
5. Confirm both policy files were actually read. Merely seeing these paths here is not compliance.
6. If a mandatory file is absent/unreadable, report `BLOCKER: POLICY_NOT_LOADED` and do not edit application code.

Agents receiving delegated tasks MUST perform their own preflight; previous agents' claims do
not substitute for loading. Never load unrelated frontend/mobile policies in this backend task.
No extension is required for this *instruction-based* arrangement; a future Pi extension may
make the gate mechanically enforceable. If `PI_CODING_AGENT_DIR` is configured, use it rather
than hardcoding `~/.pi/agent`.

## 0.1 Completion Gate (blocking)

Run and report real outputs for applicable project commands:

```bash
bun run biome:check
bun run typecheck
bun run test:changed
# Focused backend unit tests during implementation where applicable:
bun test src/modules/<Surface>/<Module>
# Env/config changes additionally require:
bun run env:derive:check
```

- Follow the orchestration phase: focused static/unit checks during implementation; broader
  final tests at Sheldon's final acceptance gate. Do not run the entire suite after every edit.
- The existing `bun test` suite is a **unit/isolated suite**: do not run tests that require live
  PostgreSQL, Redis, Valhalla, Photon, LiveKit, n8n or external network inside it. Controllers
  may use `app.inject` with mocked services; services mock repositories; SQL builders may test
  `.toSQL()`. **This does not prohibit separate isolated integration/contract/E2E suites**:
  such checks are necessary for DB semantics, migrations, external protocol contracts and
  concurrency when the task demands evidence. Never run these against production.
- Prohibited: unjustified `any`, `@ts-ignore`, `as unknown as`, linter suppression to hide bugs,
  superficial mocks or claiming tests passed without execution. On failure report `FAIL`/`BLOCKER`.
- A passed lint/typecheck is not proof that HTTP, SQL or production behavior works.

## 1. HTTP Response Contract

SSOT: `../artifacts/architecture/api_contracts.md`. Never invent a new envelope.

- Real types: `src/providers/result.provider.ts` → `Result<T> = Success<T> | Failure`.
  `Failure` carries `error: string`, `statusCode: number`, `code?`, `fields?`. Always construct using
  `ResponseOk` / `ResponseFail.{BadRequest,Validation,Unauthorized,Forbidden,NotFound,Conflict,
  UnprocessableEntity,ServiceUnavailable,Internal}`.
- Emission: `sendResult(reply, result, messageKey, options?)`. Success → `{message, data, pagination?}`;
  error → `{error, code?, fields?}`.
- `message` is an **uppercase semantic i18n key** (`LOGIN_SUCCESSFUL`,
  `SYSTEM_CONFIGS_RETRIEVED`). Prohibited: translated text, natural English phrases, or formatted
  descriptions. The same applies to `error` and `code`: stable identifiers, not prose.
- New errors exposing i18n keys → update
  `../artifacts/architecture/frontend_i18n_contracts.md` and create companion task `TASK-NNNB`.

## 2. Input Validation

`src/utils/validation.util.ts`: `validateBody`, `validateQuery`, `validateParams` (Zod → `Result`).
The `fields` of the validation error carry **i18n keys** (`validationRequired`,
`validationInvalidValue`, …), never Zod's `issue.message`. A `VALIDATION_ERROR` without mapped
`fields` is a contract bug, not a minor detail.

## 3. Layers and Module Structure

```
src/modules/<surface>/<Module>/
├── routes/        # Fastify registration + hooks (preHandler: authenticateJwt) + status
├── controllers/   # transport: parses, validates, calls the service, emits with sendResult
├── services/      # domain logic → Result<T>. Never throws; never SQL
├── repository/    # SOLE gateway to the database (Drizzle)
├── interfaces/    # module types
└── index.ts       # public surface of the module
```

- Surfaces (`verified`): `public`, `private`, `backoffice`, `internal`, `N8n`.
- Controllers: zero business logic and zero queries. Services: zero direct DB access or vendor
  SDK calls. Repository: zero business rules.
- Inter-module imports **only** through `index.ts`. Deep imports prohibited
  (`../OtherModule/services/x.service`).
- Domain-specific pure logic stays near its owning module; only genuinely generic, reusable helpers go to `src/utils/`.
- External vendor SDKs stay outside business services, behind existing `src/providers/<domain>/` when an adapter provides a meaningful boundary. Avoid ceremonial wrappers.
- TypeScript services/controllers use functional composition by default; no new application `class`/inheritance without a justified library or stateful need.

## 4. Environment and Configuration (INFRA-33 Contract)

- Every variable is declared **once** in `src/config/manifest.ts` (key → domain); the service
  using it, in `src/config/serviceDomains.ts`. Prohibited: maintaining manual key lists in infra/CI.
- After declaring a key: run `bun run env:derive` and commit `config/env-keys.json`. The gate
  `bun run env:derive:check` blocks merge if the artifact is out of sync.
- A **new domain** requires `src/config/<domain>.ts`: the deriver maps file → domain by
  `basename` (non-negotiable). Without this file, the domain is not detected and its keys disappear from
  `.env` files (root cause of the 2026-10-11 outages).
- Startup validates per service using `assertServiceEnv(<service>)`: a missing required key
  crashes **only** the service that declares it. Required keys in `REQUIRED_PROD_KEYS` (no safe
  `default` in code).
- `STATIC_KEYS` (ports, `NODE_ENV`, `SERVICE_NAME`, `ENTRYPOINT`) are set by inventory;
  `DERIVED_KEYS` are computed at runtime; `SYSTEM_KEYS` belong to the Bun/container runtime. None of
  the three enter the Infisical contract.
- `src/config/manifest.coverage.test.ts`: every `process.env.*` across `src/**` must be classified. A
  new unclassified key turns the test red.
- Prohibited: hardcoding hosts, ports, IPs (`192.168.1.X`), `localhost` literals, or credentials in
  services, adapters, HTTP clients, or controllers.

## 5. Logging

`src/providers/logger.provider.ts` (Structured Pino). `console.log` is prohibited in application
code: currently there are 17 legacy occurrences — do not add new ones, and any that are touched must be migrated.
Sensitive fields (tokens, passwords, credentials, query strings with `token`/`ticket`/`refresh_token`)
must always be redacted; the logger already sanitizes URLs, do not bypass it by logging raw objects.

## 6. API Collections (Bruno)

Each new or modified endpoint requires an executable `.bru` in `bruno/`, under the folder of its
surface (`verified`): `Public`, `Private`, `Backoffice`, `Internal`, `Tiles`, `Geo`. Each file
declares method, URL, example payload, and status / response shape assertions.

## 7. Cohesion, Legacy Debt and Migrations

- **250 LOC is a review threshold, not a hard file cap.** Review complexity, cohesion and
  dependencies before extracting; do not fragment a cohesive file just to reduce line count.
- Existing oversized modules (historical examples: `src/db/schema.ts`, `Getaways/repository`,
  `Subscriptions/services`, `Getaways/services`, `Subscriptions/repository`) are scoped debt:
  improve when relevant, without unrelated mass refactors.
- `src/db/schema.ts` remains the schema SSOT; physical migrations live in
  `database/migrations/` (`out` in `drizzle.config.ts`), generated via `bun run db:generate`.
  **Do not use `db:push` against any environment containing valuable data.**
- Review query cardinality, N+1, indexes, transactional invariants and migrations according
  to the central `backend.rules.md`, not file size alone.

## 8. Dependencies and APIs

- Exact, pinned versions in `package.json`; before proposing a library verify maintained supported releases and
  compatibility with the existing lockfile. Do not upgrade merely to chase the latest.
- Zero deprecated APIs: if the one you were going to use is deprecated, state it and propose the current one.
- Biome (`biome.json`) is the only linter/formatter. When a rule is mechanically verifiable, prefer existing tooling and CI. Add a check only
  if the tool supports the rule and it is appropriately scoped; do not force semantic rules into lint.
- Actual config state: `noExplicitAny`, `noTsIgnore` and `noConsole` at `error` (`scripts/`,
  `src/scripts/`, `src/db/seed.ts` and tests are exempt: CLI/seed code legitimately writes to the
  console). `noExcessiveLinesPerFile` at `warn` with 250 lines (tests, scripts and `src/db/schema.ts` exempt;
  legacy files above it: visible debt, not a blocking gate). Review cohesion instead of imposing a hard cap.

## 9. Commits

Conventional Commits in English, with the branch ticket when applicable:

```
<type>(<scope>): <summary> [#TICKET-ID]
```

Types: `feat`, `fix`, `refactor`, `style`, `test`, `chore`, `docs`. The body explains **why**, without
listing files. No emojis. No competitor brands in scope or commit message.

## 10. Pending Work & Technical Debt Tracking

- **Capture rule**: any technical debt, deferred task, open question, or finding requiring
  future investigation (modules, migrations, jobs, infra, tests) is written as a dedicated file in
  `../artifacts/pending/` before closing the session. Never leave it solely in a TODO or in
  conversation memory.
- **Name**: `<YYYY-MM-DD>-<module>-<slug>.md`, one topic per file.
- **Mandatory header**: table `Module / Date / Status / Priority / Source / Scope`.
- **Body**: `## Description` (one sentence: what it is, why it matters, current workaround) and
  `## Proposed solutions` (options with trade-offs and supporting artifacts, or `None explored`).
- **Resolution**: `Status: Done` + section `## Resolution` (date, what was done, files/commits) and
  move the file to `../artifacts/done/`. Never delete it.
- **Index**: `../artifacts/pending/README.md`; register upon creation, remove upon moving.

## 11. References

- Internal specifications: `docs/specs/` and `docs/VALHALLA_ENDPOINTS.md`.
- Knowledge graph: `graphify-out/` + `graphify` skill for cross-cutting refactoring impact,
  god nodes, and non-obvious coupling.
- Contracts: `../artifacts/architecture/api_contracts.md`,
  `../artifacts/architecture/database_specification.md`,
  `../artifacts/architecture/frontend_i18n_contracts.md`.
