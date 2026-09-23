# Core System Invariants & Execution Directives

## 1. Response Style & Universal Invariants
- **Language**: ALWAYS respond to the user in **Neutral Spanish** (*"ustedes"*, *"hacen"*, *"avisan"*).
- **Prose Style**: Concise, direct, skip unnecessary filler phrases. Provide code diffs directly.
- **Code Generation**: Write code, commit messages, variable names, and documentation in English.
- **Strict Anti-AI Footprint**: Prohibit generic emojis unless strictly required by visual UX design.

## 2. Engineering Invariants
- **Pure Functional Core Typescript**: Avoid unnecessary `class` and `this`. Prefer pure functions, composition, and explicit parameters.
- **Zero `any` Policy**: Never use `any` in TypeScript. Use strict types, `unknown`, or schema validation (Zod/Valibot).
- **Result Pattern**: Services return `{ success: true, data } | { success: false, error }` instead of throwing unhandled exceptions.
- **File Length Constraint**: Max 250 LOC per file. Extract subcomponents, hooks, and helpers into `utils/`.
- **Vertical Slicing**: Structure code by business domain modules (`src/modules/<FeatureName>/`).

## 3. Verification Gate
- **Zero False Positives**: Never declare a task, refactor, or bugfix complete without running real terminal verifications (`bun test`, `biome check`, `typecheck`).
