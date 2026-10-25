# React Native Engineering Policy — Expo / Mobile

**Scope:** React Native and Expo mobile application code. Load with `~/.pi/agent/policies/engineering-invariants.md`; load `frontend.rules.md` **only if the project `AGENTS.md` explicitly chooses to share its web/data-layer policy**. This file contains the mobile-specific constraints; it does not duplicate all React or general engineering rules.

**Project authority:** The mobile application's `AGENTS.md` must identify its actual `ScreenLayout`, `ScreenHeader`, tokens, navigation, Expo SDK, image/list/animation libraries and verification commands. Do not invent or replace those APIs without inspection.

## 1. Screen architecture and shared layout

- Organize code by business feature. A screen orchestrates navigation params, feature hooks and presentation blocks; complex business/query logic does not belong in giant JSX trees.
- For screens requiring headers use the project's `ScreenHeader` or header props on `ScreenLayout`, not ad-hoc `BackButton + Text` implementations. For compatible screens reuse `ScreenLayout`/approved shared wrappers; navigation-specific and fullscreen experiences may legitimately use different layouts.
- Use consistent header alignment, typography and tokens from the design system. Prefer left-aligned primary headers unless a defined screen variant differs. Do not impose fixed 18pt/12pt universally if accessibility text scaling or project tokens require otherwise.
- Titles SHOULD be concise and fit the design; allow accessibility scaling, localization and necessary multiline text. `numberOfLines={1}` is not a universal hard requirement: truncation can conceal critical context.
- Reuse gradients, safe-area handling, headers and backgrounds through coherent shared layouts when the same behavior repeats; avoid a mega-layout with dozens of flags or unnecessary extraction for coincidental similarity.
- Review screen files around 100 LOC and component files around 250 LOC for responsibility overload; no artificial hard cap or forced decomposition into dozens of tiny components.

## 2. Navigation, dialogs and interaction behavior

- Every pushed/secondary screen MUST provide appropriate platform navigation (back affordance, gesture or equivalent). Modal routes MUST provide a clear close/cancel path. Preserve focus, state and deep-link behavior.
- Choose a full navigation screen for long, multi-step, validation-heavy or deeply scrollable workflows; choose a modal/bottom sheet for focused actions or selections. Consider keyboard handling and accessibility rather than choosing solely by screen count.
- Do not stack independent native modals indiscriminately: it risks overlay/focus/backdrop collisions. Use the established root dialog/alert host when available and sequence transitions intentionally; nested picker and system dialogs may be supported by platform/library and require testing rather than blanket prohibition.
- Support loading/disabled and error/recovery states on actionable buttons; prevent unintended duplicate submissions. Never display raw backend i18n keys: translate with the project's catalog.

## 3. Native platform correctness

- MUST NOT import deprecated `SafeAreaView` from `react-native` in new code. Use `react-native-safe-area-context` (`SafeAreaView`, `useSafeAreaInsets`) or an approved layout wrapper. Avoid applying safe-area insets twice; test iOS and Android edge-to-edge behavior.
- Use the project's approved image pipeline (prefer `expo-image` when already configured). Set meaningful dimensions/aspect ratio, placeholders and cache behavior where appropriate; respect memory, privacy and signed-URL expiration. Do not introduce an image package merely to satisfy a preference.
- For long/dynamic datasets use virtualized lists (`FlatList`, `SectionList`, FlashList where installed/compatible). Avoid `ScrollView` plus large `.map()` collections. For small, bounded collections a `ScrollView` is legitimate.
- Configure stable keys, item sizing/estimation where supported, batching/window settings only when required, and pagination without duplicate fetches. Handle empty state, refresh and footer spinners without blocking scroll.
- Use `react-native-reanimated` / gesture-handler for animations or gestures that benefit from native/UI-thread execution **when installed and appropriate**. Simple animations and transitions need not introduce heavyweight dependencies. Clean up animations, tasks, listeners and subscriptions.
- Use approved secure storage for sensitive credentials; do not put secrets in plain AsyncStorage or logs. Handle offline/error states, permissions, app resume/background and network changes when the flow requires them.
- Respect touch target sizes, dynamic type/font scaling, contrast, screen-reader labels, safe touch regions, keyboard avoidance and reduced-motion preferences; avoid fixed pixels and text truncation that undermine accessibility.

## 4. State segregation and render isolation

- For projects using TanStack Query, keep authoritative remote entities in its cache; keep UI state local or in Zustand only when cross-screen/client ownership warrants it. Zustand store subscriptions SHOULD use narrow selectors; `useShallow` is useful when selecting composite structures, not a universal requirement.
- The screen/list owner SHOULD NOT subscribe to high-frequency per-item mutation state unless it genuinely needs that aggregate state. Prefer isolated leaf controls (`FavoriteToggle`, `LikeButton`) and stable identifiers where this reduces work.
- Do not promise that only the leaf re-renders or guarantee 60/120 FPS: React scheduling, context, navigation and native work affect results. Profile on representative devices before claiming improvements.
- `React.memo` is **conditional**, not mandatory for every card. Evaluate compiler setup, props stability, list virtualization and measured render hot spots.
- Use `useEffect` for external synchronization, not for derived state; handle teardown and reentrancy. Put shared/reusable complex screen behavior in feature hooks, but keep trivial local handlers in the screen where clearer.

## 5. Verification and anti-pattern review

**BLOCKER (when demonstrated):** deprecated safe-area import in new code; missing critical navigation exit, unsafe storage of credentials, unbounded rendering of large lists, leaked listeners/tasks, duplicated server cache causing correctness/security errors, overlapping dialog bug, missing required permission/error handling, or broken accessibility of a critical action.

**WARNING:** repeated header/gradient boilerplate, overly complex screens, broad state subscriptions, premature memoization, missing virtualization evidence, weak offline behavior, excessive image memory, unstable list keys, brittle absolute spacing or inaccessible truncation.

- Validate on affected platforms (iOS/Android), device sizes, large text and relevant navigation flows when resources permit. Use project lint/typecheck and focused tests, with simulator/device smoke tests for native behavior when available.
- Never claim animations are jank-free, gestures correct, modal behavior safe, or mobile performance improved solely because lint/typecheck passed. Report PASS/FAIL/NOT_RUN/N/A with remaining platform coverage.
