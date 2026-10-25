# Backend Engineering Policy — Feature-First, Functional and Verifiable

**Applies:** Backend/API/background jobs/database work in Node/Bun + TypeScript, and equivalent Go/Python/Rust services where language-appropriate. Complements `engineering-invariants.md`; project `AGENTS.md` defines actual entrypoints, contracts, tools and exceptions.

## 1. Architecture: feature-first without ceremony

- MUST preserve feature-first business modules, their public boundaries and the existing **Route → Controller → Service → Repository** flow where HTTP/persistence are involved.
- **Routes** register paths/middleware. **Controllers** parse/validate transport and map typed outcomes to HTTP; no domain workflows or SQL. **Services** own use cases, business rules, authorization of business actions, orchestration and transaction intent; no direct SQL/ORM or HTTP reply objects. **Repositories** own persistence/queries and map database details; no unrelated business policies.
- Domain rules MAY remain as private pure functions in services. Extract a domain component or dedicated use-case function only when rules are complex, independently reusable or need explicit ownership. `application/`, `ports/`, rich entities, factories and adapters are OPTIONAL, never prescribed folders.
- No circular dependencies, cross-module private deep imports, shared mutable domain state or catch-all services. A repository contract is useful when it materially reduces coupling; avoid one-interface-per-function ceremony.
- **TypeScript services/controllers:** prefer named functions, plain objects, closures and factory functions; do not add application classes/inheritance by default. Preserve library-required constructor APIs when unavoidable.
- Test seams should permit repository/provider substitution without mandatory OOP; use passed dependencies where valuable.

## 2. Errors, early returns and response stability

- Prefer guard clauses and early returns for invalid input, missing entities, denied actions and already-completed states.
- Return the project's typed `Result` from service boundaries for *expected* business failures. Unexpected faults may throw internally, but MUST reach centralized handling; never leak raw exceptions or stack traces to HTTP clients.
- Controllers MUST use the project's **single response mapper** (`sendResult` or equivalent) rather than hand-building envelopes. Maintain the established success/error formats and HTTP semantics; do not return JSON bodies for HTTP 204/HEAD or force envelopes on streams/binary payloads.
- Public response/error `message`, `error` and `code` MUST be **stable semantic i18n identifiers**, not translated or natural-language text. Validation field errors MUST be mapped to stable keys rather than library message strings. Avoid new keys unless contract coordination is included.
- Response contracts and frontend i18n catalogs must be synchronized when changed; preserve backward compatibility unless explicitly authorized.

## 3. Validation, authorization and data minimization

- Validate body/query/path/headers as relevant at the trust boundary with the project's schema tooling. Validate external-provider responses when untrusted.
- Authenticate at transport boundaries; AUTHORIZE in the appropriate business operation, including object ownership/tenant scopes (BOLA/IDOR) and restricted fields. Never trust client-supplied owner IDs or mass-assign arbitrary request fields.
- MUST return **explicit public DTO projections** containing only business-required fields. MUST NOT use `SELECT *`, unrestricted ORM model spreads or expose password hashes, tokens, secrets, private fields, internal metadata, or unnecessary PII.
- Use explicit create/update allowlists; redact secrets from logs and API errors. Passwords require vetted password-hashing KDFs; encryption at rest/in transit must follow approved cryptographic implementations and key management.
- Set sensible limits for payload size, rate limiting (risk-based), pagination, network timeouts and result sets.

## 4. Query design and N+1 prevention

- MUST inspect query cardinality whenever looping over entities, calling repositories repeatedly or loading related entities. Never issue per-item DB requests when a bounded batch, join, set-based SQL or appropriate ORM eager loading is clearly better.
- `Promise.all(rows.map(repository.get...))` does **not** fix N+1: it retains N queries and may overload the pool. Prefer set-based queries or bounded batching.
- Use `INNER JOIN` only where missing related rows should exclude results. Use `LEFT JOIN`, `EXISTS`, aggregations, CTEs or separate bounded queries when their semantics and plan are better. Avoid join fan-out that duplicates rows or breaks pagination.
- Explicitly select columns; push filters/aggregations/pagination to the database when appropriate; avoid filtering giant result sets in memory.
- Use parameterized SQL/ORM bindings; never concatenate untrusted SQL or SQL identifiers. Validate allowed sort columns and dynamic filters.
- Before claiming SQL is optimized, examine representative queries, schema and indexes; for relevant bottlenecks use `EXPLAIN (ANALYZE, BUFFERS)` **only where safe to execute** (ANALYZE runs the statement; avoid production-mutating statements). Document assumptions about row counts and query load.

## 5. PostgreSQL, schema and indexes

- PostgreSQL 18 provides native `uuidv7()`. UUIDv7 can also be generated in the application on earlier PostgreSQL versions. For **new identifiers**, prefer UUIDv7 only when consistent with schema, ID contracts, libraries and migration strategy; NEVER rewrite existing IDs by default.
- Design indexes from real `WHERE`, `JOIN`, `ORDER BY` conditions, selectivity and query plans. Consider composite column order, partial/covering indexes, write amplification, bloat and migration rollout. Avoid indexing every column automatically.
- Enforce correctness with foreign keys, unique/check constraints, nullability and required indexes. Application checks alone are insufficient under concurrency.
- Ship reviewed physical migrations; no destructive or data-mutating schema sync against live environments without explicit authorization. Assess lock duration, backward compatibility, rollback and rollout order.
- Query plans depend on statistics, cardinality and workload; an index or join is not inherently faster.

## 6. Async, concurrency and resource lifecycle

- Use sequential `await` where ordering/dependency requires it. Use `Promise.all` only for a **small, known, independent set** where fail-fast behavior is acceptable; it does not limit concurrency or guarantee cancellation of already-running work.
- For unknown/large sets use bounded concurrency, batching or a queue; guard DB pool limits, provider rate limits and memory. Use `Promise.allSettled` only where independent partial outcomes are explicitly required and each failure is handled.
- Never start floating promises unintentionally; propagate/handle failures and cancellation. Use timeouts for remote calls, clean up streams/connections, avoid blocking event-loop hot paths.
- For Go, use `context.Context`, bounded goroutines and idiomatic errors; for Python, prefer bounded async tasks, cancellation and runtime-appropriate DB usage.
- Database transactions must span atomic workflows. Protect read-modify-write invariants from concurrent races using constraints, isolation, locks, conditional updates or another justified strategy. Avoid long external network calls inside DB transactions.
- Retry only idempotent operations or those guarded by idempotency keys; use bounded exponential backoff where needed. Use outbox/inbox only when delivery guarantees justify complexity.

## 7. External providers, logging and observability

- Put provider-specific SDK calls in a clearly owned integration adapter when dealing with external side effects, retries, vendor errors or replacements. Do not introduce adapters for trivial stable standard-library operations.
- Use structured production logging with correlation/request ID where available, safe error categories and redaction. No `console.log` in application code. Never log credentials, raw auth URLs or sensitive bodies.
- Metrics/tracing should focus on critical paths (latency, error rate, query count, saturation); avoid excessive noisy logs or high-cardinality labels.

## 8. Design patterns: fit the problem

- **Repository** for persistence boundaries; **Result** for expected typed outcomes; **Factory function** for dependency wiring; **Strategy** when multiple real behaviors must vary; **Adapter** for meaningful external vendor isolation; **Policy/pure function** for a real domain invariant; **Unit of Work/transaction function** when multiple writes must be atomic.
- Use composition over inheritance. MUST NOT introduce abstract base classes, generic factories, events, CQRS, event sourcing, hexagonal layers, dependency containers or microservices without a demonstrated requirement and trade-off.
- Do not turn every service method into a separate use-case file. File size is a review signal, not an automatic extraction trigger.

## 9. Verification: behavior, transport, DB and performance

- For changes to business rules, add behavioral unit and regression tests (success, failure, boundaries). For APIs, validate transport/schema/authorization/error mapping and update **executable Bruno** collections when required by project policy.
- SQL builders' `.toSQL()` tests do **not** prove real PostgreSQL behavior, migrations, constraints, transactions or query plans. When relevant, request/run isolated integration tests using test databases; never hit production as a test fixture.
- Concurrency-sensitive operations require appropriate race/idempotency tests; performance claims need query counts, plans or benchmarks when feasible.
- During development run focused, cheap checks; run the project final gate at the agreed phase. Do not claim unexecuted integration/performance checks passed.
- Review diff for N+1, unbounded `Promise.all`, unexpected public fields, missing auth, bad error mapping, lock contention, unnecessary abstractions, secrets and scope creep.

## 10. Agent preflight and completion report

1. Load project `AGENTS.md` and universal policy; confirm the task falls in backend scope.
2. Trace entrypoint → controller/service/repository or job → service/repository; inspect relevant schema, contracts and tests.
3. Choose the smallest cohesive implementation; identify query, concurrency, security and response-contract risks.
4. Implement and update tests, Bruno/API/i18n docs and migration artifacts **only where affected**.
5. Execute relevant commands and final gate as the project's orchestration specifies.
6. Report changed modules; `PASS/FAIL/NOT_RUN/N/A` checks, remaining warnings and blockers with evidence.

**BLOCKER:** introduced contract/security/correctness violation; dangerous data exposure or unverified dangerous migration; demonstrated non-atomic invariant or unauthorized access. **WARNING:** suspected N+1, needless abstraction, unmeasured hot path, oversized/cohesion risk or potential index issue requiring investigation. Never disguise a warning as a measured finding.
