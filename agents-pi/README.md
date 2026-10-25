# Pi Agent Bundle (pi-subagents & Native MCP)

Suite modular de agentes especializados, reglas universales de ingeniería, servidores MCP y skills adaptados para el harness de codificación **Pi Coding Agent** con el plugin `pi-subagents` y soporte nativo de Model Context Protocol (MCP).

---

## Overview

Este paquete configura el entorno de **Pi** (`~/.pi/agent/`) para operar como un orquestador multi-agente determinista y autónomo. Integra directivas de enrutamiento estricto, gestión de contexto aislado, servidores MCP locales y una biblioteca de 34 skills especializadas bajo el estándar Agent Skills.

---

## Bundle Structure

```text
agents-pi/
├── AGENTS.md                  # Protocolo de enrutamiento y delegación para Pi
├── APPEND_SYSTEM.md           # Operating Contract global adjunto al system prompt de Pi
├── settings.json              # Configuración global de Pi optimizada para subagentes
├── mcp.json                   # Servidores MCP nativos (Cogni Semantic Memory)
├── agents/                    # Definiciones de roles de agente (.md con frontmatter)
│   ├── sheldon.md             # Arquitecto jefe y orquestador (SDD / Plan)
│   ├── homero.md              # Constructor e implementador táctico
│   ├── edna.md                # Diseñadora UX/UI y artesana visual
│   ├── gorgory.md             # Auditor de seguridad y código muerto
│   ├── tio-bob.md             # Revisor senior de código y PRs/MRs
│   ├── contador.md            # Estratega financiero y fiscal (España/UE)
│   └── saul.md                # Consejero legal y regulatorio (España/UE)
├── extensions/                # Extensiones locales para Pi (compact-tool-boxes, etc.)
└── prompts/                   # Plantillas y comandos de prompt de Pi (~/.pi/agent/prompts/*.md)
```

> **Nota:** Las policies y skills han sido unificadas en `agents-globals/` y se instalan en `~/.agents/` (`~/.agents/policies/` y `~/.agents/skills/`), donde Pi y cualquier otro harness los detectan de forma nativa e interoperable.

---

## Quick Start & Installation

### Opcion 1: Instalacion Automatica via Pinky CLI (Recomendado)

Desde la raiz del repositorio:

```bash
# Instalar harness de Pi (copia configuraciones, agentes, rules y skills)
pinky install pi

# Instalar addons recomendados y actualizar plugins
pinky pi-addons
```

### Opcion 2: Despliegue Manual en Pi

1. **Limpieza y preparacion de plugins de Pi:**
   ```bash
   # Eliminar plugins obsoletos/puentes innecesarios
   pi uninstall npm:pi-open-agents 2>/dev/null || true
   pi uninstall npm:pi-mcp-adapter 2>/dev/null || true

   # Actualizar extensiones y core de Pi
   pi update --extensions
   pi update

   # Instalar plugin oficial de subagentes y addons recomendados
   pi install npm:pi-subagents
   pi install npm:pi-web-access
   pi install npm:@juicesharp/rpiv-todo
   pi install npm:@juicesharp/rpiv-ask-user-question
   pi install npm:@nguyenquangthai/pi-omp-theme
   ```

2. **Copiar los recursos a la carpeta global de Pi:**
   ```bash
   mkdir -p ~/.pi/agent
   cp -R agents-pi/* ~/.pi/agent/
   ```

---

## Usage Reference

### Cambio de Rol Principal

Para asumir un rol primario en la sesion interactiva de Pi:

```text
/agent sheldon
/agent homero
/agent edna
/agent tio-bob
/agent gorgory
```

### Delegacion como Subagente

Los agentes orquestadores pueden delegar trabajo atomico a subagentes especializados invocando la tool `subagent`:

```text
subagent({ agent: "homero", task: "Implementar componente Button segun tokens de diseño..." })
```

### Servidores MCP Nativos

Pi carga automáticamente la configuración de `~/.pi/agent/mcp.json` para interactuar con servidores MCP locales como **Cogni** (memoria semántica persistente):

```json
{
  "mcpServers": {
    "cogni": {
      "args": ["mcp"],
      "command": "~/.local/bin/cogni",
      "type": "stdio",
      "lifecycle": "eager",
      "directTools": true
    }
  }
}
```
