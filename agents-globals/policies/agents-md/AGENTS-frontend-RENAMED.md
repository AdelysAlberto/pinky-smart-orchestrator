# Frontend Project — Agent Contract (React / Astro)

> Scope: this frontend project only. This file defines **project integration and operating contracts**; engineering principles live in centrally managed policies. Follow the parent `../AGENTS.md` for product, business, security, branding, and organization rules when present. Do not assume an absent parent file exists.

## 0. Mandatory policy preflight

Before planning, editing, or auditing frontend code:

1. Resolve the policy directory as `${AGENTS_DIR:-$HOME/.agents}/policies/` (expand in the shell when reading files).
2. **Read in full** `engineering-invariants.md` and `frontend.rules.md` from that directory. Do not treat this list of paths as proof that files were read.
3. Read `verification-gates.md` **when present**, before final approval; it is a checklist, not an additional authority.
4. Inspect `package.json`, lockfile, scripts, framework config, and relevant source files to establish the **actual** stack, architecture, commands, and conventions.
5. If a mandatory policy is missing or unreadable, do not edit code: report `BLOCKER: missing mandatory policy <path>`.
6. Apply React-specific rules only to React code and applicable React islands; use Astro idioms for Astro components, content, routing, server rendering, and hydration. **Never add React/TanStack Query/Zustand to Astro merely to satisfy a React policy.**

**Precedence:** explicit product/security contracts and mandatory project behavior are preserved; universal policies and frontend policy govern general engineering practices; this file supplies repository-specific paths and tooling. Report genuine conflicts rather than silently choosing one. Do not expand the task to rewrite unrelated legacy code.

## 1. Architecture and repository discovery

- Organize application features by business capability where the project uses feature modules. Keep UI, hooks, API services, types, and local utilities near their owning feature; share only genuinely cross-feature building blocks.
- Respect module public boundaries and existing exports. Do not invent folders, layers, interfaces, or hook wrappers to fit a diagram.
- **React app:** when the repository uses `View → Hook → Service`, preserve that boundary and keep query/cache operations in domain hooks, not views. Follow `frontend.rules.md` for exceptions such as providers and framework entry points.
- **Astro app:** prefer `.astro` components and server-side/static rendering for non-interactive UI. Use framework islands only for necessary interactivity; choose appropriate hydration directives and account for server/client boundaries. Astro endpoints/actions and server code must not leak secrets to the browser.
- Discover the actual route registration, module entry points, styling conventions, design tokens, shared components, and translation setup; avoid hardcoded assumptions across projects.

## 2. Project profile — existing Backoffice (only if these paths exist)

The following settings describe the **current backoffice**, not requirements to impose on another React/Astro application:

- Domain contract: `../artifacts/architecture/api_contracts.md`, section *Administrative Backoffice Modules (`/api/v1/bo/*`)*. Inspect the current contract before modifying clients; if it conflicts with implementation, report and resolve deliberately—do not silently change public behavior.
- Modules: `src/modules/<Module>/`; shared UI: `src/components/`; infrastructure: `src/providers/`; navigation: `src/navigation/`; styles: `src/styles/`.
- New registered backoffice modules must be added to `src/navigation/navGroups.ts` and `paths.ts` when those files own navigation. Cross-module consumption goes through established public exports.
- HTTP: `src/providers/http/request.instance.ts` is the canonical request client and handles base URL, authentication context, and 401. `src/services/apiClient.ts` is a legacy compatibility adapter; do not use for new endpoints.
- Tables: reuse `src/components/DataTable` and the installed TanStack Table. Keep server-side pagination, filtering, and sorting on the server when the endpoint is paginated. Preserve query parameters and stable cache keys.
- Routing: use `src/navigation/PrivateRoute.tsx`, `private.routes.tsx`, and `PublicRoute` if present; do not scatter route definitions into `App.tsx`.
- Sessions: use `src/providers/storage/cookieStorage.provider.ts` when this project contract applies; never introduce `localStorage` for tokens. **Do not assume JavaScript-readable cookies are inherently secure:** prefer HttpOnly, Secure, SameSite server-set cookies when the architecture permits; evaluate CSRF and XSS protections, and do not silently replace the existing auth scheme.
- Visual source of truth: `src/styles/tokens.css` and `src/styles/theme.css`. Use semantic theme tokens, supporting both light/dark modes; avoid ad-hoc literal colors or shadows where tokens exist. Prioritize readability and accessible tables/forms.
- i18n: locale sources in `src/providers/i18n/` and `src/modules/<Module>/locales/`; `es` and `en` must remain synchronized. Translate user-facing strings and backend message/error codes; never display raw unknown API keys as UI copy.
- Admin operations (deletion, suspension, refunds, role changes): require appropriate confirmation; ensure required audit events are recorded by the authoritative backend, not by UI-only assumptions. UI permission gating is **not** authorization.

## 3. Dependencies and stack discipline

- Installed versions and supported scripts come from `package.json`, the lockfile, and framework config—not copied version lists in this document.
- Follow the project's chosen framework and libraries. Do not introduce new routers, state libraries, fetch clients, testing frameworks, CSS systems, or component kits without a concrete need and compatibility review.
- Do not upgrade framework/SDK or critical packages as collateral work. Check documented API compatibility before introducing integrations.
- Framework-specific tooling applies only when present: e.g. React/Vite TypeScript checks, Astro `astro check`, and the project's configured build/test commands.

## 4. Verification and delivery

- Discover the real verification commands from project scripts. **For this backoffice, when available:**
  `bun run biome:check && bun run typecheck && bun test && bun run build`
- The backoffice `typecheck` checks both app and test TypeScript programs; preserve their separate runtime globals. Do not inject Bun/Node globals into browser-only types to suppress errors.
- Use fast, affected-scope checks during implementation and the appropriate full gate at the final approval stage. Do not claim success for commands not run.
- Unit tests are fast and deterministic; **integration and browser E2E tests are allowed in separately configured environments** when they validate real behavior. Never call mocked unit tests evidence that a browser or backend integration works.
- Inspect relevant `git diff`, compatibility, accessibility, loading/empty/error/success states, translations, security, and affected route behavior. Astro: check hydration/output mode; React: check cache ownership and effect cleanup where applicable.
- Distinguish `PASS`, `FAIL`, `NOT_RUN`, `NOT_APPLICABLE`. If tooling or browser execution is unavailable, report what remains unverified rather than claiming production readiness.
- Avoid broad unrelated cleanup. Existing file-length warnings, hook dependency warnings, or legacy architecture issues are review signals—not automatic reasons for mechanical fragmentation.

## 5. Delivery conventions (when this repository uses them)

- Conventional Commits in English: `<type>(<scope>): <summary> [#TICKET-ID]`; explain *why* in the body. No unrelated release or dependency changes.
- Track genuine deferred follow-ups under `../artifacts/pending/<domain>/` with the project's required frontmatter, status and index, then move resolved items to `../artifacts/done/`. Do not generate debt files for already fixed, trivial, or unrelated observations.
- Preserve the project's upstream specifications and API/i18n contracts. If an external source is absent, state it explicitly and avoid inventing a replacement.

**Completion principle:** correctness, security, module cohesion and verifiable behavior outrank line counts, pattern ceremony or a visually attractive folder structure.
