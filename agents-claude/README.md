# Claude Code Agent Bundle

Este directorio contiene la suite completa de agentes, reglas de ingeniería y skills adaptados para **Claude Code**.

## Estructura del Bundle

```text
agents-claude/
├── CLAUDE.md            # Invariantes globales y protocolo de enrutamiento
├── settings.json        # Configuración de usuario para Claude Code
├── agents/              # Subagentes especializados (~/.claude/agents/*.md)
│   ├── sheldon.md       # Arquitecto jefe y orquestador (SDD / Plan)
│   ├── homero.md        # Constructor e implementador táctico
│   ├── edna.md          # Diseñadora UX/UI y artesana visual
│   ├── gorgory.md       # Auditor de seguridad y código muerto
│   ├── tio-bob.md       # Revisor senior de código y PRs/MRs
│   ├── contador.md      # Estratega financiero y fiscal (España/UE)
│   └── saul.md          # Consejero legal y regulatorio (España/UE)
├── rules/               # Reglas por dominio (~/.claude/rules/*.md)
└── skills/              # 27 Skills bajo estándar Agent Skills (~/.claude/skills/*)
```

## Instalación

### Global (`~/.claude/`)
```bash
mkdir -p ~/.claude
cp agents-claude/CLAUDE.md ~/.claude/CLAUDE.md
cp -R agents-claude/agents ~/.claude/
cp -R agents-claude/rules ~/.claude/
cp -R agents-claude/skills ~/.claude/
```

### Por Proyecto (`.claude/`)
```bash
mkdir -p .claude
cp agents-claude/CLAUDE.md ./CLAUDE.md
cp -R agents-claude/agents .claude/
cp -R agents-claude/rules .claude/
cp -R agents-claude/skills .claude/
```
