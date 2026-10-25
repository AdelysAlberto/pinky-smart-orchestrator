# Frontend Engineering Policy — React Web, Feature-First, Verifiable

**Scope:** React web applications, dashboards and backoffice. Load together with `~/.agents/policies/engineering-invariants.md`. React Native loads this policy **only for shared React/data-layer conventions explicitly adopted by its project**; mobile-specific behavior is governed by `react-native.rules.md`. `AGENTS.md` governs the actual project layout, API client, component library and verification commands.

**Semantics:** MUST/MUST NOT are obligations; SHOULD is the default with a documented exception. Judge failures with evidence; do not claim a render or accessibility guarantee from architecture alone.

## 1. Feature ownership and restrained composition

- Preserve the project's business-oriented modules (`Accounts`, `Garage`, `Getaways`, etc.) and explicit public exports. UI composition follows **Screen/Page → domain hook → HTTP service**, for application data flows; pure presentational components and local UI state need **no artificial hook or service**.
- React components SHOULD be function components; no new application `class`, inheritance or `React.FC` unless a library/interface genuinely requires them. Type props explicitly. Never add unsafe `any` or type-suppression to bypass a real issue.
- Screens/pages compose layouts, hooks, and domain components; keep business rules, HTTP orchestration and complex state machines out of JSX. Do not move all local handlers into hooks by reflex.
- Put reusable base controls/layouts in the project's existing shared UI area, not a second design system. Extract repeated UI when its semantics/behavior are shared; two superficially similar layouts do not necessarily justify a new abstraction.
- **250 LOC component / 100 LOC screen** are review signals, **not hard limits**. Evaluate readability, ownership, cyclomatic complexity, and separation of concerns before extracting.
- Domain-specific pure transformations stay beside their domain or consumer. Truly generic, independently reusable functions MAY belong in shared `utils`; purity alone never mandates `utils/`.

## 2. Transport, DTOs and the one-way data flow

- When using the project's TanStack Query architecture, **HTTP services** own endpoint URLs, HTTP calls, transport DTO conversion and backend Result/envelope handling. Services MUST NOT import React, query hooks, Zustand stores or view modules. Only API/transport infrastructure may access the low-level API client directly.
- **Domain query/mutation hooks** own `useQuery`, `useMutation`, query keys, cache invalidation, optimistic cache updates and translating transport outcomes to a stable UI-facing shape. They MUST NOT be implemented inside view components under this project convention.
- **Views** MUST NOT call HTTP clients/services directly, import TanStack Query primitives, or mutate the query cache. Views consume hooks and receive state/callbacks; leaf/presentational components can receive props without their own hook.
- App-root providers, non-React events/push integrations and query-client setup MAY interact with `QueryClient` as infrastructure with explicit ownership.
- Maintain API DTOs outside services (e.g. `types/api/<resource>.types.ts` if configured by the project). Feature-specific view models may live inside the feature. Do not conflate server DTOs with forms or component props.
- Respect backend `Result` and stable semantic i18n keys. Display translated, user-appropriate messages in the UI; do not show raw server error codes or library exception messages.
- Cross-feature consumption uses the designated public module API (e.g. `index.ts`), not imports into sibling modules' internals. No circular dependencies.

## 3. TanStack Query correctness and cache ownership

- Server-state collections/entities MUST use TanStack Query (or the explicitly approved data layer); MUST NOT duplicate the authoritative server cache in Zustand/local stores. Local ephemeral UI state belongs near its consumer; Zustand is for genuinely shared client state, **not every boolean or input**.
- Query keys MUST include all variables defining the request (resource ID, tenant/identity, filters, page, sort). Avoid collisions across accounts and tenants. Never cache private data under a key shared across users.
- Specify enabled conditions, stale/refetch/retry policy, and pagination/infinite-query behavior according to domain requirements. Do not force refetch loops or retain sensitive user cache after logout/account switch.
- Mutation flows MUST handle errors and relevant invalidations. Optimistic updates require a coherent optimistic state, rollback/reconciliation, and concurrency consideration; prefer simpler mutation + invalidate when optimistic UI adds unnecessary complexity.
- Query/mutation hooks should return predictable pending/error/success states. Distinguish initial loading from background fetching where UI behavior differs. Avoid destructuring or copying server objects into long-lived local state without a justified editing workflow.
- Use `select` or narrow subscriptions where they reduce work **without hiding server data changes**; verify with React DevTools/profile measurements when performance is asserted.

## 4. React lifecycle and render performance

- Render must be pure: no network calls, subscriptions, navigation actions or state writes during render. Use event handlers for user actions, and effects only for actual synchronization with external systems; clean up subscriptions, listeners and timers.
- Do not use effects for values derivable from props/state during render. Multiple effects are a **review trigger**, not an extraction requirement: group by coherent external synchronization, not by file count.
- Avoid unnecessary parent subscriptions to frequently changing leaf state; lift state only to its actual shared owner. Prefer stable IDs and targeted cache/selectors for interactive list elements **where profiling shows an impact**.
- `React.memo`, `useMemo`, `useCallback` are conditional optimizations, not universal obligations or guarantees of zero re-renders. Check whether the project uses React Compiler and measure before adding memoization everywhere.
- Lists MUST use stable semantic keys, bounded data fetching and suitable virtualization for long collections; avoid indexing as key when order/items change. Avoid expensive calculations and side effects inside list render functions.
- Respect concurrent UI behavior, component unmounts, races and stale responses; prefer TanStack Query cancellation and lifecycle support over ad hoc state synchronization.

## 5. Styling, usability and security

- Reuse approved design tokens, component variants, CSS Modules and accessible patterns. Avoid arbitrary inline styling when a stable class/token suffices. Dynamic runtime values and framework-imposed styles MAY use inline styles with justification; do not create classes for every unique runtime value.
- Interactive controls MUST have appropriate labels, focus visibility, keyboard interaction, disabled/pending behavior and touch/click targets. Use semantic HTML, form labels, field-level validation and accessible status announcements.
- Screens MUST account for applicable initial loading, empty, error/retry, success and background refresh states; do not render fake empty results while a request is pending. Avoid skeletons for micro-interactions where they add visual churn.
- Respect responsive layouts, localization, long translated strings, time zones and RTL when applicable. Do not hardcode presentation strings that should use the project's i18n catalog.
- Do not persist credentials or sensitive tokens in client storage without following the project's approved threat model. Avoid XSS sinks (`dangerouslySetInnerHTML`) unless content is trusted/sanitized. Enforce access on backend; frontend route guards are user experience, not authorization.

## 6. Anti-pattern review and enforcement

**BLOCKER (when demonstrated):** view directly calls HTTP under the project's layer contract; invalid cache ownership leading to stale/cross-user data; unsafe token or private data exposure; leaked subscriptions; missing accessible interaction for a newly introduced critical UI control; silent failures; circular module dependencies; unhandled mutations corrupting user data.

**WARNING (requires evidence/assessment):** overlarge screens, duplicated UI wrappers, broad parent subscriptions, needless effects, universal `memo`/`useCallback`, excessive invalidation, repeated requests, unbounded rendered lists, new dependencies or abstractions lacking a concrete benefit.

- Verify architectural imports with configured static rules/tests; do not paste unvalidated Biome JSON into policy as though every version supports it. Test both prohibited and allowed imports when introducing a rule.
- Run project lint/typecheck and focused component/hook tests; integration/e2e and accessibility checks where behavior warrants. Inspect actual diff and report PASS/FAIL/NOT_RUN/N/A, with evidence. No unverifiable performance promises.
