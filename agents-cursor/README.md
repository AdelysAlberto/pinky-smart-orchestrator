# Cursor Agent Bundle

Este directorio contiene la suite completa de agentes, reglas de ingeniería y skills adaptados para **Cursor** (Cursor IDE / Composer / Subagents).

## Estructura del Bundle

```text
agents-cursor/
├── AGENTS.md            # Invariantes globales y protocolo de enrutamiento
├── agents/              # Subagentes especializados (~/.cursor/agents/*.md)
│   ├── sheldon.md       # Arquitecto jefe y orquestador (SDD / Plan)
│   ├── homero.md        # Constructor e implementador táctico
│   ├── edna.md          # Diseñadora UX/UI y artesana visual
│   ├── gorgory.md       # Auditor de seguridad y código muerto
│   ├── tio-bob.md       # Revisor senior de código y PRs/MRs
│   ├── contador.md      # Estratega financiero y fiscal (España/UE)
│   └── saul.md          # Consejero legal y regulatorio (España/UE)
├── rules/               # Reglas de ingeniería (~/.cursor/rules/*.md o .cursor/rules/*.mdc)
└── skills/              # 27 Skills bajo estándar Agent Skills (~/.cursor/skills/*)
```

## Instalación

### Global (`~/.cursor/`)
```bash
mkdir -p ~/.cursor
cp agents-cursor/AGENTS.md ~/.cursor/AGENTS.md
cp -R agents-cursor/agents ~/.cursor/
cp -R agents-cursor/rules ~/.cursor/
cp -R agents-cursor/skills ~/.cursor/
```

### Por Proyecto (`.cursor/`)
```bash
mkdir -p .cursor
cp agents-cursor/AGENTS.md ./AGENTS.md
cp -R agents-cursor/agents .cursor/
cp -R agents-cursor/rules .cursor/
cp -R agents-cursor/skills .cursor/
```
