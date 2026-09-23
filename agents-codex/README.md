# OpenAI Codex Agent Bundle

Este directorio contiene la suite completa de agentes, reglas de ingeniería y skills adaptados para **OpenAI Codex**.

## Estructura del Bundle

```text
agents-codex/
├── AGENTS.md            # Invariantes globales y protocolo de enrutamiento
├── config.toml          # Configuración global de OpenAI Codex
├── agents/              # Definiciones de roles de agente
│   ├── sheldon.md       # Arquitecto jefe y orquestador (SDD / Plan)
│   ├── homero.md        # Constructor e implementador táctico
│   ├── edna.md          # Diseñadora UX/UI y artesana visual
│   ├── gorgory.md       # Auditor de seguridad y código muerto
│   ├── tio-bob.md       # Revisor senior de código y PRs/MRs
│   ├── contador.md      # Estratega financiero y fiscal (España/UE)
│   └── saul.md          # Consejero legal y regulatorio (España/UE)
├── rules/               # Reglas por dominio (~/.codex/rules/*.md)
└── skills/              # 27 Skills bajo estándar Agent Skills (~/.codex/skills/*)
```

## Instalación

### Global (`~/.codex/`)
```bash
mkdir -p ~/.codex
cp agents-codex/AGENTS.md ~/.codex/AGENTS.md
cp agents-codex/config.toml ~/.codex/config.toml
cp -R agents-codex/agents ~/.codex/
cp -R agents-codex/rules ~/.codex/
cp -R agents-codex/skills ~/.codex/
```
