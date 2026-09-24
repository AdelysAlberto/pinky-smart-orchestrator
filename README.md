<h1 align="center">Pinky Smart Orchestrator</h1>

<p align="center">
  <b>Universal Multi-Agent Orchestration & Standardization Framework</b><br>
  <i>Empower your AI coding assistants with specialized roles, domain rules, modular skills, and deterministic verification across all major agentic harnesses.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.3-blue.svg?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/Runtime-Node.js%20%7C%20Bun-orange.svg?style=for-the-badge" alt="Runtime">
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License">
</p>

---

## Overview

**Pinky Smart Orchestrator** is a universal framework designed to standardize, orchestrate, and elevate the performance of autonomous coding assistants. It bridges the gap between raw LLM capabilities and rigorous software engineering standards by providing domain-isolated agents, universal engineering rules, and modular skill bundles.

Rather than relying on single monolithic prompts, Pinky enforces strict separation of concerns across Architecture, Implementation, UX/UI Design, Security Auditing, Code Review, Tax/Financial Strategy, and Regulatory Compliance. Each role operates within strict boundaries, ensuring zero false positives and verifiable terminal deliverables.

---

## What It Solves

- **Context Pollution & Drift**: Eliminates oversized prompts by lazy-loading domain rules and modular skills on demand.
- **Architectural Deviation**: Prevents implementation agents from making unauthorized system design decisions without explicit technical blueprints.
- **Inconsistent Quality Gates**: Establishes deterministic verification before marking any task as complete (`bun test`, `biome check`, `typecheck`).
- **Multi-Tool Fragmentation**: Single unified bundle that installs and synchronizes configurations seamlessly across Pi, Claude Code, Cursor, Codex, OpenCode, VS Code Copilot, and Google Antigravity.

---

## Key Features

- **Interactive Scrollable CLI**: Terminal UI supporting arrow-key navigation (`↑`/`↓`), real-time search filtering, and single/multi-harness installation.
- **Cross-Platform Native Support**: Automated setup and persistent `$PATH` configuration for macOS, Linux, WSL, and native Windows (PowerShell/CMD).
- **Zero-Dependency Runtime**: Built with native ESM modules requiring no prior `npm install` steps.
- **7 Specialized Agent Roles**: Clear division of responsabilidades between strategic planning, construction, visual craft, security, and quality gates.
- **27 Modular Agent Skills**: Standardized `SKILL.md` packages covering databases, modern frontend, mobile native, styling, testing, and legal compliance.
- **Semantic Release Automation**: Built-in script (`release.sh`) for automated `patch`, `minor`, and `major` tag releases and GitHub publishing.

---

## Supported Harnesses

| Harness | Platform / Environment | Target Directory | Primary Config File |
| :--- | :--- | :--- | :--- |
| **Pi** | Pi Coding Agent (`pi-open-agents`) | `~/.pi/agent/` | `AGENTS.md`, `settings.json` |
| **Claude Code** | Anthropic Claude Code CLI | `~/.claude/` | `CLAUDE.md`, `settings.json` |
| **Cursor** | Cursor IDE & Composer | `~/.cursor/` | `AGENTS.md` |
| **OpenAI Codex** | OpenAI Codex CLI / Environment | `~/.codex/` | `AGENTS.md`, `config.toml` |
| **OpenCode** | OpenCode Autonomous Agent | `~/.config/opencode/` | `AGENTS.md`, `opencode.json` |
| **VS Code Copilot** | GitHub Copilot Custom Agents | `~/.copilot/` | `copilot-instructions.md` |
| **Google Antigravity** | Antigravity IDE & Antigravity 2.0 | `~/.gemini/config/` | `GEMINI.md`, `AGENTS.md` |

---

## Quick Start & Installation

### macOS, Linux & WSL (Bash / Zsh)

Run the following one-line installer in your terminal:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/AdelysAlberto/pinky-smart-orchestrator/main/install.sh)
```

### Windows (PowerShell)

Run the following command in PowerShell:

```powershell
irm https://raw.githubusercontent.com/AdelysAlberto/pinky-smart-orchestrator/main/install.ps1 | iex
```

The installer automatically deploys the global executable `pinky` to `~/.local/bin/pinky` (Unix) or `pinky.cmd` / `pinky.ps1` (Windows) and ensures it is accessible from your system `$PATH`.

---

## CLI Command Reference

Once installed, the `pinky` command is globally available in any terminal session:

| Command | Description | Example |
| :--- | :--- | :--- |
| `pinky` | Launches the interactive terminal menu to select and install harnesses. | `pinky` |
| `pinky install <harness>` | Directly installs the bundle into a specific harness (`pi`, `claude`, `cursor`, `codex`, `opencode`, `copilot`, `antigravity`, `all`). | `pinky install pi` |
| `pinky pi-addons` | Instala los paquetes y extensiones recomendadas para Pi (`pi-open-agents`, `pi-mcp-adapter`, `pi-memory`, etc.). | `pinky pi-addons` |
| `pinky herdr` | Instala el dashboard Herdr, integraciones de agentes (`pi`, `claude`, `opencode`) y la skill global. | `pinky herdr` |
| `pinky upgrade` | Pulls the latest Pinky Core updates from GitHub and synchronizes all active harnesses. | `pinky upgrade` |
| `pinky status` | Displays all configured harnesses and their target filesystem paths. | `pinky status` |
| `pinky version` | Outputs current installed version, git commit hash, and core directory. | `pinky version` |
| `pinky help` | Prints the complete usage guide and command reference. | `pinky help` |

### Interactive Menu Navigation

- **Arrow Keys (`↑` / `↓`)**: Navigate through the list of harnesses.
- **Enter**: Confirm selection and proceed with installation.
- **Typing text**: Instant search and filtering.
- **Numbers (`1-8`)**: Direct selection by index.
- **Ctrl+C**: Cancel operation safely.

---

## Multi-Agent Dashboard & Multiplexer (Herdr)

[Herdr](https://herdr.dev/) es un gestor de paneles y multiplexor para terminal diseñado para orquestar y supervisar múltiples sesiones de agentes CLI en paralelo (Pi, OpenCode, Claude Code).

> [!NOTE]
> Para comprender en detalle su funcionamiento y flujo de trabajo, recomendamos leer el artículo de referencia:  
> [WebReactivA: Herdr para desarrolladores](https://www.webreactiva.com/blog/herdr)

Podéis instalarlo de forma interactiva y guiada mediante Pinky CLI en cualquier sistema operativo:

```bash
pinky herdr
```

O realizar la instalación manual paso a paso:

#### 1. Instalar binario de Herdr

- **macOS / Linux**:
  ```bash
  curl -fsSL https://herdr.dev/install.sh | sh
  ```

- **Windows (PowerShell)**:
  ```powershell
  powershell -ExecutionPolicy Bypass -c "irm https://herdr.dev/install.ps1 | iex"
  ```
  *Si las políticas de seguridad de Windows bloquean comandos PowerShell en memoria, ejecuten en Command Prompt (CMD):*
  ```cmd
  curl.exe -fsSLo install.cmd https://herdr.dev/install.cmd && install.cmd && del install.cmd
  ```

#### 2. Instalar la integración según el agente
```bash
herdr integration install pi        # Para Pi Coding Agent
herdr integration install claude    # Para Claude Code
herdr integration install opencode  # Para OpenCode
```

#### 3. Instalar la skill global de comunicación IPC para agentes
```bash
npx skills add ogulcancelik/herdr --skill herdr -g
```

---

## Specialized Agents Lineup

| Agent | Role | Responsibility | Mode |
| :--- | :--- | :--- | :--- |
| `@sheldon` | Chief Architect & Orchestrator | System design, SDD specifications, DDL data schemas, API contracts, root-cause investigation, and execution plans (`plan/<TAG>.md`). | Read-only |
| `@homero` | Tactical Builder & Craftsman | Implementation of application code, component construction, bug fixes, refactors, and test suites. | Read-Write |
| `@edna` | Lead UX/UI Designer | Interaction flows, design tokens, visual architecture, mobile ergonomics, and CSS design systems (`artifacts/ux/`). | Read-Write |
| `@gorgory` | Security & Code Hygiene Auditor | OWASP vulnerability scans, orphan endpoint discovery, secret exposure audits, and dead code mitigation (`artifacts/security/`). | Read-only |
| `@tio-bob` | Senior Code Reviewer | Clean Code quality gates, architectural invariant verification, PR/MR inspection, and merge safety validation. | Read-only |
| `@contador` | Tax & Financial Strategist | Tax structuring, IRPF, VAT/IVA, corporate taxes, and cross-border financial rules for Spain and the European Union. | Read-only |
| `@saul` | Senior Legal & Compliance Counsel | Regulatory compliance, GDPR/RGPD, EU AI Act, LSSI-CE, Terms of Service, licensing, and intellectual property. | Read-only |

---

## Universal Engineering Invariants

All harnesses configured by Pinky strictly adhere to the following technical standards:

1. **Pure Functional Paradigm**: Avoid classes, inheritance hierarchies, and shared mutable state where pure functions and modular composition suffice.
2. **Result Pattern**: Service boundaries and network handlers return discriminated union types (`{ success: true, data } | { success: false, error }`) instead of throwing uncaught exceptions.
3. **File Length Discipline**: Strict maximum of 250 lines of code per file. Break complex modules down into cohesive subcomponents and utilities.
4. **Vertical Slicing**: Codebases organized by feature domains (`src/modules/<FeatureName>/`) rather than technical layers.
5. **Anti-AI Footprint**: Prohibition of generic decorative emojis in source code, technical reports, commit messages, and documentation.
6. **Zero False Positives & Technical Rigor (Anti-Sycophancy)**:
   - **No Pandering / Intellectual Honesty**: Never validate flawed premises or anti-patterns to flatter the user. Challenge invalid assumptions with established theory and standards.
   - **Mandatory Investigation Before Answering**: Prior context investigation is mandatory before emitting judgments. No guesswork or superficial first-found answers.
   - **Empirical Execution Evidence**: Every completed task must pass deterministic terminal verifications (`bun test`, `biome check`, `typecheck`).
7. **Production & Live Database Guardrails**: Strictly read-only (`SELECT` only) on production databases. Modification or destructive actions in production are non-negotiable and prohibited.

---

## Modular Skills Catalog

The bundle includes modular agent skills compliant with the **Agent Skills** specification (`SKILL.md`):

### Architecture & Backend
- `backend-architecture`: Vertical slicing, Result Pattern, structured logging, and HTTP standards.
- `database-design`: PostgreSQL schemas, Drizzle ORM, migrations, indexing, and Redis caching.
- `doc-database`: Query optimization, execution plans, and transaction boundaries.
- `security-hardening`: OWASP Top 10 mitigation, rate limiting, and defensive input sanitization.

### Frontend & Mobile
- `react-typescript-clean-code`: Clean Architecture, pure components, and custom hooks for React 18/19+.
- `react-native-architecture`: Expo Router, Fabric/TurboModules, Reanimated 3, and Callstack optimization.
- `mobile-native`: iOS HIG, Material Design 3, safe areas, touch targets, and gesture ergonomics.
- `css-architecture`: CSS Modules, BEM methodology, design token hierarchies, and GPU transitions.
- `zustand`: State management with atomic selectors (`useShallow`) and render loop prevention.
- `frontend-design`: Distinctive visual systems, typography pairings, and modern palette design.
- `i18n-localization`: React-i18next setup, namespaced translations, and RTL logical properties.

### Design & UX
- `ux-decision`: Systematic UX reasoning, premise interrogation, and state completeness sweeps.
- `ux-wireframing`: Wireframe specifications, user flows, and visual token structures.
- `visual-craft`: Optical alignment, concentric corner radii, and shadow elevation models.
- `impeccable`: Frontend polish, refinement, interaction hardening, and aesthetic elevation.
- `accessibility`: WCAG 2.2 AA / Section 508 compliance, focus trapping, and screen reader semantics.

### Quality, Auditing & Testing
- `auditor`: Codebase health inspection, technical debt analysis, and architecture discovery.
- `gadget-auditor`: Dead code elimination, orphan route detection, and semantic drift auditing.
- `testing-strategy`: Unit tests, integration tests with MSW, and coverage diagnostics.
- `house-testing`: Diagnostic test harness setup and edge-case validation.
- `tio-bob`: PR/MR review protocol, clean code metrics, and pull request quality gates.

### Product, Business & Strategy
- `product-requirements`: Product Requirements Documents (PRDs), briefs, and MoSCoW scoping.
- `market-research`: Competitor analysis, feature parity benchmarks, and positioning matrices.
- `growth-copywriting`: Conversion copywriting frameworks (AIDA, PAS, BAB, FAB).
- `tax-accounting`: Tax calculations (IRPF, RETA, IS, VAT) for freelancers and corporations in Spain/EU.
- `legal-compliance`: European legal compliance, GDPR, EU AI Act, and software licensing.
- `scrum-planning`: Agile task breakdown, story point estimation, and dependency graphs.
- `linkedin`: Technical thought leadership and architecture storytelling.
- `graphify`: Persistent knowledge graphs from codebases and documentation.
- `cogni`: Autonomous semantic memory and token-efficient signature storage.
- `herdr`: Multi-agent terminal multiplexing, pane orchestration, and socket IPC communication.

---

## Release Automation

For repository maintainers, automated semantic releases are managed via [`release.sh`](file:///Volumes/Datos/Projects/pi/pi-orchestrator-py/release.sh):

```bash
# Interactive mode (queries latest Git tag and prompts for bump type)
./release.sh

# Direct CLI bump
./release.sh patch   # Increments PATCH (e.g. v1.0.5 -> v1.0.6)
./release.sh minor   # Increments MINOR (e.g. v1.0.5 -> v1.1.0)
./release.sh major   # Increments MAJOR (e.g. v1.0.5 -> v2.0.0)
```

The script performs the following tasks:
1. Queries the latest Git tag from local and remote references.
2. Updates the `VERSION` constant in `bin/pinky`.
3. Creates a Conventional Commit (`chore(release): vX.Y.Z`).
4. Creates an annotated Git tag.
5. Pushes the branch and tag to the remote repository.
6. Generates a GitHub Release via `gh` CLI if installed and authenticated.

---

## Repository Architecture

```text
pinky-smart-orchestrator/
├── install.sh                  # Universal Unix bootstrap installer (macOS/Linux/WSL)
├── install.ps1                 # Native Windows PowerShell installer
├── release.sh                  # Automated semantic release script
├── bin/
│   ├── pinky                   # Global Pinky CLI core executable (Node/Bun ESM)
│   ├── pinky.cmd               # Windows Command Prompt batch wrapper
│   └── pinky.ps1               # Windows PowerShell execution wrapper
├── scripts/
│   └── installer.mjs           # Interactive harness selection CLI engine
├── agents-pi/                  # Bundle for Pi Coding Agent (pi-open-agents)
├── agents-claude/              # Bundle for Anthropic Claude Code
├── agents-cursor/              # Bundle for Cursor IDE & Composer
├── agents-codex/               # Bundle for OpenAI Codex
├── agents-opencode/            # Bundle for OpenCode CLI
├── agents-copilot/             # Bundle for VS Code GitHub Copilot
├── agents-antigravity/         # Bundle for Google Antigravity IDE & 2.0
├── main/                       # Master templates for agents, rules, and skills
└── README.md                   # Project documentation and specifications
```

---

## Author & Maintenance

**Adelys Alberto Belen**  
Software Engineer & Technical Architect  
- **GitHub**: [@AdelysAlberto](https://github.com/AdelysAlberto)  
- **Website**: [adalbeca.com](https://adalbeca.com)  
- **Email**: [dev@adalbeca.com](mailto:dev@adalbeca.com)  

---

## License

This project is licensed under the [MIT License](LICENSE).
