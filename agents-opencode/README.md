# OpenCode Agent Bundle

Este directorio contiene la suite completa de agentes, reglas de ingeniería y skills adaptados para **OpenCode**.

## Estructura del Bundle

```text
agents-opencode/
├── AGENTS.md            # Invariantes globales y protocolo de enrutamiento
├── opencode.json        # Configuración principal de OpenCode
├── agents/              # Definición de agentes (~/.config/opencode/agents/*.md)
│   ├── sheldon.md       # Arquitecto jefe y orquestador (SDD / Plan)
│   ├── homero.md        # Constructor e implementador táctico
│   ├── edna.md          # Diseñadora UX/UI y artesana visual
│   ├── gorgory.md       # Auditor de seguridad y código muerto
│   ├── tio-bob.md       # Revisor senior de código y PRs/MRs
│   ├── contador.md      # Estratega financiero y fiscal (España/UE)
│   └── saul.md          # Consejero legal y regulatorio (España/UE)
├── rules/               # Reglas por dominio (~/.config/opencode/rules/*.md)
└── skills/              # 27 Skills bajo estándar Agent Skills (~/.config/opencode/skills/*)
```

## Instalación

### Global (`~/.config/opencode/`)
```bash
mkdir -p ~/.config/opencode
cp agents-opencode/AGENTS.md ~/.config/opencode/AGENTS.md
cp agents-opencode/opencode.json ~/.config/opencode/opencode.json
cp -R agents-opencode/agents ~/.config/opencode/
cp -R agents-opencode/rules ~/.config/opencode/
cp -R agents-opencode/skills ~/.config/opencode/
```
