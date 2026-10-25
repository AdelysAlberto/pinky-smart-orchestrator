# Viasera Mobile App (`app/`) — Project Operating Contract

> This document contains **Viasera-specific decisions**. Universal engineering rules and React Native practices live in central Pi policies; do not copy them into this file. Business, security, brand, and product instructions from `../AGENTS.md` also apply where available. **Inspect the repository before trusting historical versions, counts, or paths.**

## 0. Mandatory Pi policy preflight

Before planning, modifying, reviewing, or approving mobile code, load the following files **in full**, using the Pi agent directory (`${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}`):

1. `policies/engineering-invariants.md` — required for every engineering task.
2. `policies/react-native.rules.md` — required for mobile / Expo work.
3. `policies/frontend.rules.md` — **not loaded by default**. Load only for a cross-project task explicitly involving the separate web/backoffice codebase or a concrete web-specific convention, and apply only the relevant sections.
4. `policies/verification-gates.md` — optional operational checklist at review/final gates; not an independent policy or override.

Also load `../AGENTS.md` if present, and applicable acceptance contracts under `../artifacts/`. A reference is **not proof of a read**: the acting agent and each independent auditor must read applicable policies or receive their confirmed contents via the execution harness. Missing mandatory files -> `BLOCKER`, not silent fallback. Do not assume global policy injection for child agents (`systemPromptMode: replace` / independent subprocesses). Re-evaluate scope if the task crosses mobile/backend boundaries.

**Precedence:** system/tool safety constraints > explicit task requirements that are compatible with security and product contracts > root/project `AGENTS.md` for product-specific behavior > central engineering policies for engineering technique. When two requirements materially conflict, report it and resolve before an irreversible change; do not silently invent a precedence exception. Scope-specific project conventions supplement, rather than redefine, the core policies.

## 1. Sources of truth and stack decisions

- **Specs:** `../artifacts/architecture/api_contracts.md`, `../artifacts/architecture/frontend_i18n_contracts.md`, `../artifacts/design/ux_specification.md`, `../artifacts/design/branding_identity.md`, and relevant `../artifacts/functional_specs/<module>.md` **if present**. Verify current paths; never fabricate a missing document. When real device behavior contradicts a specification, investigate the root cause and update the correct artifact plus implementation rather than hiding the discrepancy.
- **Actual versions:** `package.json`, lockfile, Expo config, `biome.json` and installed type declarations. Historical baseline (2026-10-23): Expo 58, React 19, RN 0.88, TanStack Query v5, Zustand v5, MapLibre RN v11, Reanimated v4, Biome v2. These are **not** authoritative version pins; inspect the repository.
- Keep approved package versions and the lockfile strategy. Do **not** upgrade Expo SDK, RN, Reanimated, MapLibre, TypeScript or native plugins during an unrelated task. Investigate Expo compatibility and native rebuild requirements before changes. Existing `expo.install.exclude` and AsyncStorage compatibility decisions are intentional until superseded by a separately validated migration.
- Existing decisions: **FlatList** (do not introduce FlashList without justification), **MapLibre + `@mapbox/polyline`** (do not introduce another map engine), **`expo-image` / `RemoteImage`** for remote images, **`expo-speech-recognition`** for primary speech recognition with `useVoiceRecorder` + backend `/api/v1/ai-routes/transcribe` fallback. Native plugin changes require appropriate prebuild/new binary; do not pretend OTA can supply missing native code.
- Biome is the main lint/format gate and `expo lint` is complementary where configured. Verify third-party API signatures against the installed version and current docs before use.

## 2. Project module map and boundaries

```text
app/                                  # Expo Router navigation entries/layouts
src/modules/{private,public}/<Feature>/
  <Feature>Screen/                    # Feature-owned screen/presentation
  components/  hooks/  services/  utils/  types/  index.ts
src/components/                      # Shared, genuinely reusable UI
src/providers/                       # App-wide integrations and context
src/stores/                          # Shared UI/client state
src/services/                        # Cross-cutting infrastructure only
src/utils/                           # apiClient, environment and generic utilities
src/theme/                           # Design tokens and motion
```

- **Feature-first** organization is required; cross-feature consumers use the owning feature's `index.ts` public API, not deep imports of private internals. Keep feature-specific pure functions near the feature; `utils/` is not an automatic destination for every pure function.
- Project data boundary: **View -> feature Hook -> Service -> `fetchApi`**. Views never invoke HTTP, repositories, query-cache primitives, or service implementations directly. TanStack Query owns authoritative remote server data; avoid competing copies in Zustand. React Native policy supplies the general rendering/state guidance.
- Public API types/DTOs belong outside service implementations and must match approved backend contracts. Use the established `Result<T, string>` / error-code conventions. Keep query keys scoped to ownership/session, invalidate correctly and handle optimistic rollback when applicable.
- Existing import enforcement: inspect `biome.json` overrides for `style/noRestrictedImports` before changing view/service boundaries. A rule described in prose is not automatically a working lint gate: verify by a deliberately invalid import in a disposable location where appropriate, then remove it.

## 3. API, credentials and environments

- All app-to-server HTTP uses `fetchApi` in `src/utils/apiClient.ts`. It distinguishes definitive HTTP rejection (typically 4xx) from transient failure (network, timeout, 429, 5xx). No independent `fetch`/Axios transport in components or feature services without an explicitly approved infrastructure exception.
- Mobile never connects directly to internal LAN STT/TTS/LLM/geospatial engines. Backend mediates these requests. On-device speech recognition is the intentional native exception; server transcription fallback still uses backend.
- Environment values originate from `src/utils/env.ts` / `configEnvs`, configured via `EXPO_PUBLIC_*`. **EXPO_PUBLIC values are public, not secrets.** No hardcoded hosts, IPs, ports or developer LAN URLs in application logic. Environment switching uses `node scripts/switch-env.cjs <development|production>` if the script exists.
- Credentials belong in the established `src/providers/storage` secure-storage path, never plaintext AsyncStorage, analytics, or logs. Check permission flows and session/account changes for data leakage.

## 4. i18n — actual Viasera contract

- All user-facing application copy is translated with `useTranslation()` / `t(key)` or approved translation utilities. Do not hardcode Spanish/English/Portuguese UI strings. Exempt genuinely nonlinguistic identifiers, debug text and third-party mandated content where appropriate.
- Maintain parity for `es`, `en`, `pt` in `src/providers/i18n/locales/`; update all three together and run `src/providers/i18n/__tests__/localeParity.test.ts`. Default fallback language is English for unsupported device locales.
- JSON translation keys follow existing nested/root conventions; do not introduce literal dot-separated JSON keys such as `"common.back"`. Reuse root common action keys (`back`, `cancel`, `save`, `retry`, etc.) where already defined.
- Backend codes are mapped via `src/utils/i18nKey.ts` (`resolveI18nKey`) and `src/utils/apiErrorMessage.ts` (`resolveApiErrorMessage`) per `../artifacts/architecture/frontend_i18n_contracts.md`. Never render unknown raw backend keys to users; provide translated fallback.

## 5. Viasera navigation, UI and map specifics

- Use existing `ScreenLayout`, `ScreenHeader`, `ScreenScrollView`, `Button`, `IconButton` and `AppStatusBar` **according to their inspected real props**. Do not manually rebuild shared headers, safe-area wrappers or status bar; allow genuinely exceptional full-screen/map experiences if tested. Do not render `expo-status-bar`'s `StatusBar` directly where the app's `AppStatusBar` is expected.
- **Design tokens** live in `src/theme/tokens.ts` (colors, radii, typography). Avoid ad-hoc brand hex/radius/shadow declarations and needless layout duplication. Keep touch labels legible under localization and large text; do not force one-line truncation when it hides important meaning. Respect visual/interaction acceptance criteria from the product design artifacts.
- Preserve the project's `Pressable` usage convention: prefer shared `Button`/`IconButton` for ordinary actions; direct `Pressable` is appropriate for touchable cards, chip/tab selection, gesture/swipe rows, and custom map/HUD controls when semantically justified.
- Navigation-intensive experiences (forms, route editing, complex maps) use Expo Router screens, not full-screen native modals by default. Use the existing `showAlert` / `src/stores/alertStore` for global dialogs; when a native modal needs a confirmation, follow the tested in-modal `CustomAlert` approach. Avoid native modal presentation collisions.
- Active navigation behavior is a product contract: **heading-up camera**, **centered navigation puck with moving map**, **off-route recalculation**, and compass switching between north-up / direction-of-travel. Changes to these behaviors require actual device verification and explicit acceptance.
- Two distinct voice actions remain visible in `SearchHeader` and `HomeSearchBar` for eligible FREE/PRO experiences: **Lucide `Mic` = dictation/search text (no LLM/quota)**; **`ViaraIcon` = AI copilot (may consume AI quota)**. Do not merge them or route ordinary dictation through the AI workflow.
- Use `@maplibre/maplibre-react-native` and existing tested pure layer/style builders (e.g. `buildMapLayers`); no large style construction inside screen JSX.

## 6. Mobile regression and verification

**During development:** run relevant fast checks and focused unit tests, not the entire suite after every edit. **At final gate**, run the project-configured commands (if available):

```bash
bun run biome:check
bun run typecheck
bun test
# Optional complementary diagnostics (if configured): bun run lint / npx expo lint
```

- In this project's current `bun test` convention, tests are **isolated deterministic unit tests** with mocks/fakes; do not silently introduce live PostgreSQL, external services, network, or E2E behavior into that command. This does **not** ban separate integration/E2E/device test workflows when explicitly provisioned.
- Static checks cannot prove correct gestures, navigation, maps, push, native permissions, voice, modals, or platform behavior. Test affected flows on device/simulator on iOS and Android when available; otherwise report `NOT_RUN` and capture pending verification. Never claim device validation from a passing unit suite.
- Existing observability: `src/utils/devLog.ts` is the development logger; avoid ad-hoc application `console` statements. Preserve active Biome `noExplicitAny`, `noTsIgnore`, `noConsole` and file-length warning configuration without assuming historical counts are current.
- Long files (including known Routes/Navigation files) are **review candidates, not automatic failures**; avoid increasing unrelated legacy complexity. Extract based on cohesive responsibilities, not arbitrary LOC alone.
- Cross-platform fixes must preserve both iOS and Android behavior, with explicit platform branches only where needed. Avoid claims of 60/120 FPS without representative device profiling.

## 7. Release, commits and traceability

- Conventional Commits in English: `<type>(<scope>): <summary> [#TICKET-ID]`, with `feat`, `fix`, `refactor`, `style`, `test`, `chore`, `docs`; explain **why** in the body. No emojis in commit summaries.
- Release commands, when explicitly requested and verified in scripts: `bun run release:patch|minor|major`; Android `build:apk`, `build:bundle`, `build:apk:arm64`; EAS `build:eas:apk`. Do not build/publish releases during unrelated work.
- Track concrete deferred defects, unknowns, technical debt and unverified **native** behavior as individual files in `../artifacts/pending/` with filename `<YYYY-MM-DD>-<module>-<slug>.md`, header fields `Module / Date / Status / Priority / Source / Scope`, and `## Description` / `## Proposed solutions`. Register in `../artifacts/pending/README.md`. Upon verified resolution, add `## Resolution`, mark Done, move to `../artifacts/done/`, and update the index. Do not create bureaucratic tickets for trivial already-resolved observations.

## 8. Completion evidence

Before marking work ready for review, state: affected modules; required policies actually read; changed contracts; verification commands + PASS/FAIL/NOT_RUN; device/platform coverage; unresolved risks or pending artifacts. **Never claim success without execution evidence.** Escalate architectural, security, privacy or critical regression blockers. This AGENTS.md is not a replacement for an auditor's independent review.
