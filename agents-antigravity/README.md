# Antigravity Agent Bundle (Google Antigravity / IDE / Antigravity 2.0)

Este directorio contiene la suite de agentes optimizados, reglas de ingeniería y skills adaptados para el entorno de desarrollo **Google Antigravity** (IDE, CLI y Antigravity 2.0).

## Estructura del Bundle

```text
agents-antigravity/
├── GEMINI.md            # Invariantes globales y registro de agentes para Antigravity
├── config/
│   ├── AGENTS.md        # Protocolo de enrutamiento y delegación
│   ├── agents/          # Agentes especializados (.md con frontmatter Antigravity)
│   │   ├── sheldon.md   # Arquitecto jefe y orquestador (SDD / Plan)
│   │   ├── homero.md    # Constructor e implementador táctico
│   │   ├── edna.md      # Diseñadora UX/UI y artesana visual
│   │   ├── gorgory.md   # Auditor de seguridad y código muerto
│   │   ├── tio-bob.md   # Revisor senior de código y PRs/MRs
│   │   ├── contador.md  # Estratega financiero y fiscal (España/UE)
│   │   └── saul.md      # Consejero legal y regulatorio (España/UE)
│   ├── rules/           # Reglas universales (.rules.md con frontmatter de globs/conditions)
│   │   ├── engineering-invariants.rules.md
│   │   ├── runtime.rules.md
│   │   ├── frontend.rules.md
│   │   ├── backend.rules.md
│   │   ├── react-native.rules.md
│   │   ├── verification-checklist.rules.md
│   │   └── commits.rules.md
│   └── skills/          # 27 Skills modulares bajo estándar Agent Skills
```

## Instalación

### Configuración Global (`~/.gemini/config/`)
Para desplegar este bundle como la configuración global del usuario en Antigravity:

```bash
mkdir -p ~/.gemini/config
cp agents-antigravity/GEMINI.md ~/.gemini/GEMINI.md
cp -R agents-antigravity/config/* ~/.gemini/config/
```

### Configuración por Workspace (`<workspace>/.agents/`)
Para aplicar las reglas, skills y agentes a un repositorio específico:

```bash
mkdir -p .agents
cp -R agents-antigravity/config/agents .agents/
cp -R agents-antigravity/config/rules .agents/
cp -R agents-antigravity/config/skills .agents/
cp agents-antigravity/GEMINI.md ./AGENTS.md
```
