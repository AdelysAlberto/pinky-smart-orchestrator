# Pi Agent Bundle (pi-open-agents)

Este directorio contiene la suite de agentes optimizados, reglas de ingeniería y skills adaptados para el harness de codificación **Pi** con el plugin `pi-open-agents`.

## Estructura del Bundle

```text
agents-pi/
├── AGENTS.md            # Protocolo de enrutamiento y delegación para Pi
├── APPEND_SYSTEM.md     # Invariantes universales del sistema
├── settings.json        # Configuración de Pi con soporte para pi-open-agents
├── agents/              # Definiciones de roles de agente (.md con frontmatter)
│   ├── sheldon.md       # Arquitecto jefe y orquestador (SDD / Plan)
│   ├── homero.md        # Constructor e implementador táctico
│   ├── edna.md          # Diseñadora UX/UI y artesana visual
│   ├── gorgory.md       # Auditor de seguridad y código muerto
│   ├── tio-bob.md       # Revisor senior de código y PRs/MRs
│   ├── contador.md      # Estratega financiero y fiscal (España/UE)
│   └── saul.md          # Consejero legal y regulatorio (España/UE)
├── rules/               # Reglas universales de ingeniería
│   ├── engineering-invariants.md
│   ├── runtime.md
│   ├── frontend.md
│   ├── backend.md
│   ├── react-native.md
│   ├── verification-checklist.md
│   └── commits.md
└── skills/              # 27 Skills modulares bajo estándar Agent Skills
```

## Instalación Global en Pi

Para desplegar este bundle en el entorno global de Pi (`~/.pi/agent/`):

1. **Instalar el plugin de gestión de agentes:**
   ```bash
   pi install npm:pi-open-agents
   ```

2. **Copiar o enlazar los recursos:**
   ```bash
   mkdir -p ~/.pi/agent
   cp -R agents-pi/* ~/.pi/agent/
   ```

## Uso

- **Cambio de rol principal:**
  ```text
  /agent sheldon
  /agent homero
  /agent edna
  ```
- **Delegación como subagente:**
  Los agentes orquestadores pueden delegar trabajo atómico a subagentes invocando:
  ```text
  subagent("homero", "Implementar componente de login...")
  ```
