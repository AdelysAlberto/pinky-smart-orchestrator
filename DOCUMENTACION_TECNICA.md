# Documentación Técnica: Pinky Smart Orchestrator
## Sistema de Orquestación Agéntica Concurrente, Agnóstica y sin Docker

---

## 1. Resumen Ejecutivo y Visión General

**Pinky Smart Orchestrator** es una plataforma de orquestación agéntica diseñada para coordinar pipelines de desarrollo de software con agentes especializados (`sheldon`, `homero`, `edna`, `tio-bob`).

El sistema resuelve las limitaciones críticas de los arneses tradicionales (que ejecutan subagentes dentro del mismo proceso acumulando contexto) y de los enfoques basados en virtualización pesada (Docker/LXC), mediante una arquitectura ligera basada en:

1. **Sandboxes Nativos con Git Worktrees**: Aislamiento total del sistema de archivos sin necesidad de instalar Docker, máquinas virtuales ni demonios pesados.
2. **Clasificación Local Instantánea con Laya-API (0 Tokens)**: Ruteo no autoregresivo en ~30 ms mediante inferencia local sobre Apple Silicon (MPS), ahorrando hasta un 75% de tokens.
3. **Arquitectura Agnóstica de Arneses**: Capacidad de ejecutar indistintamente sobre **Pi**, **OpenCode** o **Claude Code**.
4. **Control Dual Concurrente (CLI + Web)**: Operación no bloqueante donde las decisiones pueden tomarse desde la terminal o desde un Dashboard Web en tiempo real.
5. **Memoria Semántica Persistente con Cogni**: Ingesta previa de invariantes del proyecto y guardado estructurado de aprendizajes.

---

## 2. Arquitectura del Sistema y Componentes

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            PINKY SMART ORCHESTRATOR                              │
│                                                                                  │
│   ┌────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐   │
│   │   Cola FIFO SQLite │────►│ Coordinador Pipeline │────►│   Laya-API Local │   │
│   │   (Persistencia)   │     │ (Fast-Path / Full)   │     │ (30ms / 0 Tokens)│   │
│   └────────────────────┘     └──────────────────────┘     └──────────────────┘   │
│              ▲                          │                           │            │
│              │                          ▼                           ▼            │
│   ┌────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐   │
│   │  Dashboard Web WS  │     │ Decision Hub (Dual)  │     │ Adaptador Arnés  │   │
│   │  (Terminal + MD)   │     │ (CLI [s/n] + Web API)│     │ (Pi/OpenCode/Cl.)│   │
│   └────────────────────┘     └──────────────────────┘     └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Sandbox Efímero: Git Worktree       │
                      │    .pinky/worktrees/<task-id>/         │
                      │    - Subproceso PTY con stream ANSI    │
                      │    - Aislamiento de rama develop       │
                      │    - Ingesta / Persistencia Cogni      │
                      └────────────────────────────────────────┘
```

### 2.1 Componentes Principales

- **`orchestrator/router_bridge.py` (Clasificador Laya-API)**:
  Envía el prompt a `http://127.0.0.1:8090/analyze`. Determina en 30 ms:
  - `scope`: `single` (Fast-Path directo) o `plan_and_build` (pipeline completo).
  - `domain`: `code` (`homero`), `ux` (`edna`), `review` (`tio-bob`), `security` (`gorgory`).
  - `effort`: `low` (modelo flash/rápido) o `high` (modelo pro/razonamiento alto).

- **`orchestrator/worktree_manager.py` (Sandbox Nativo)**:
  Crea un Git worktree en `.pinky/worktrees/<task-id>` vinculado a la rama `pinky/<task-id>`. Permite que los agentes modifiquen código, instalen paquetes y ejecuten pruebas sin alterar la rama de trabajo principal (`develop`).

- **`orchestrator/harnesses/` (Adaptadores Agnósticos)**:
  Implementa el patrón adaptador (`BaseHarnessAdapter`) con drivers específicos:
  - `PiHarnessAdapter`: Invoca `/Users/adelysalberto/.local/bin/pi` en modo headless (`-p`).
  - `OpenCodeHarnessAdapter`: Invoca `/Users/adelysalberto/.opencode/bin/opencode run`.
  - `ClaudeHarnessAdapter`: Invoca `/Users/adelysalberto/.local/bin/claude -p`.

- **`orchestrator/agent_runner.py` (Lanzador PTY)**:
  Ejecuta el subproceso del arnés a través de una pseudo-terminal (`pty.openpty()`), asegurando que las salidas ANSI y colores de la terminal se capturen en tiempo real y sin retardos de búfer.

- **`orchestrator/decision_hub.py` (Puerta de Control Dual)**:
  Maneja un `asyncio.Event` multiplexado. Cuando se requiere aprobación humana, escucha concurrentemente en la terminal (prompt interactivo) y en la API REST/WebSocket. La primera entrada recibida desbloquea la ejecución.

- **`orchestrator/queue_engine.py` (Motor de Cola FIFO)**:
  Base de datos SQLite en `.pinky/orchestrator.db` que registra el estado, historial y transiciones de cada tarea (`QUEUED`, `ROUTING`, `RUNNING`, `AWAITING_APPROVAL`, `COMPLETED`, `FAILED`).

- **`orchestrator/server.py` y `orchestrator/static/` (Dashboard Web)**:
  Servidor FastAPI que emite eventos vía WebSockets (`/ws/telemetry`) hacia una interfaz web responsiva en modo oscuro con vista dividida (Consola PTY en vivo y Visor Markdown dinámico).

---

## 3. Flujo Operativo y de Decisión

### 3.1 Ruta Rápida (Fast-Path para Tareas Acotadas)
Si Laya-API clasifica la tarea como `scope: single` (ej. corrección de un bug, ajuste CSS o revisión puntual):

1. **Encolado**: La tarea entra a la cola FIFO en SQLite.
2. **Creación de Worktree**: Se genera `.pinky/worktrees/<task-id>` en ~30 ms.
3. **Despacho Directo**: Se omite a Sheldon y la puerta de aprobación; se lanza directamente al especialista (`homero` o `edna`) con modelo económico (`effort: low`).
4. **Verificación y Merge**: Si los tests pasan, se fusiona la rama en `develop` y se destruye el worktree.

### 3.2 Ruta Completa (Full Pipeline para Arquitectura y Nuevas Features)
Si Laya-API clasifica la tarea como `scope: plan_and_build`:

1. **Fase de Arquitectura (@sheldon)**:
   - Se inyecta contexto previo de Cogni (`.pinky_context.md`).
   - Sheldon inspecciona el código en modo solo-lectura y genera `plan/<task-id>.md`.
2. **Puerta de Aprobación Dual**:
   - La terminal muestra: `[?] Plan generado en plan/<task-id>.md. ¿Aprobar? [S/n]: `
   - El dashboard web activa el banner con el botón **Aprobar Plan** y renderiza el Markdown.
   - El usuario confirma desde cualquiera de las dos vías.
3. **Fase de Construcción (@homero)**:
   - Homero ejecuta los cambios del checklist y corre las pruebas (`bun test`).
4. **Fase de Revisión (@tio-bob)**:
   - Tio Bob audita el `git diff` contra `develop` y valida estándares.
5. **Persistencia y Limpieza**:
   - Se guarda la firma técnica en Cogni (`cogni save`).
   - Se integra la rama a `develop` y se elimina el worktree efímero.

---

## 4. Guía Práctica de Uso

### 4.1 Requisitos Previos e Instalación

```bash
cd /Volumes/Datos/Projects/pi/pi-py

# 1. Crear y activar entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# 2. Instalar dependencias mínimas
pip install -r requirements.txt
```

### 4.2 Iniciar el Servicio y el Dashboard Web

Para ejecutar el orquestador en segundo plano con interfaz web:

```bash
python -m orchestrator start
```

- **Dashboard Web**: Disponible en `http://127.0.0.1:8765`.
- Permite encolar tareas, pausar/reanudar la cola, ver la salida de terminal en vivo y aprobar planes técnicos.

### 4.3 Ejecutar Tareas Directamente desde la Terminal (CLI)

```bash
# Ejecución con arnés por defecto (Pi)
python -m orchestrator run "Refactorizar el módulo de pagos al patrón Result"

# Ejecución especificando OpenCode como arnés
python -m orchestrator run "Corregir errores de tipado en models.py" --harness opencode

# Ejecución especificando Claude Code como arnés
python -m orchestrator run "Crear suite de pruebas unitarias para webhooks" --harness claude
```

### 4.4 Consultar el Estado de la Cola

```bash
python -m orchestrator list
```

Muestra una tabla con el identificador de tarea, estado, alcance resuelto, arnés y descripción.

### 4.5 Integración MCP para Cursor, VS Code, Pi y OpenCode

Pinky expone un servidor **Model Context Protocol (MCP)** nativo sobre `stdio`:

```bash
python -m orchestrator mcp
# o mediante el CLI instalado:
pinky mcp
```

#### Configuración en Cursor / VS Code (`.cursor/mcp.json` o configuración global):
```json
{
  "mcpServers": {
    "pinky": {
      "command": "pinky",
      "args": ["mcp"]
    }
  }
}
```

#### Herramientas MCP Disponibles en el Chat:
- **`orchestrate_task(prompt, harness)`**: Dispara el pipeline completo o Fast-Path desde la ventana de chat del IDE.
- **`approve_task(task_id, approved)`**: Aprueba o rechaza el plan técnico de Sheldon directamente desde el chat sin abrir la terminal.
- **`get_task_status(task_id)`**: Consulta el progreso en vivo de la tarea.
- **`list_tasks()`**: Muestra la lista de tareas encoladas y completadas.

---

## 5. Comparativa de Ventajas y Eficiencia

### 5.1 Docker / LXC vs Sandbox Nativo con Git Worktrees

| Criterio | Docker / LXC | Sandbox Git Worktree (Pinky) |
| :--- | :--- | :--- |
| **Tiempo de Arranque** | 5 a 15 segundos | **< 50 milisegundos** |
| **Requisitos de Instalación** | Docker Desktop / Daemon activo | **Ninguno** (Usa Git nativo del sistema) |
| **Compatibilidad `node_modules`** | Conflicto binarios (macOS ARM64 vs Linux) | **100% Nativo** (Misma arquitectura del host) |
| **Consumo de Memoria** | 2 GB a 4 GB por contenedor | **Cero sobrecarga de virtualización** |
| **Seguridad de Rama Principal**| Aislamiento en contenedor | **100% Aislado** mediante ramas Git temporales |

### 5.2 Consumo de Tokens: Con Laya-API vs Pipeline Ciego

| Tipo de Tarea | Sin Laya (Pipeline Ciego) | Con Laya-API Local | Ahorro Obtenido |
| :--- | :--- | :--- | :--- |
| **Bugfix puntual o ajuste CSS** | ~80.000 tokens (3 agentes) | **~25.000 tokens (1 agente)** | **-68% tokens / -75% tiempo** |
| **Revisión de Diff / PR** | ~75.000 tokens (3 agentes) | **~18.000 tokens (1 agente)** | **-76% tokens / -80% tiempo** |
| **Feature Arquitectónica** | ~85.000 tokens | **~85.000 tokens** | 0% (Requiere pipeline completo) |
| **Pregunta o Consulta de Estado**| ~25.000 tokens | **0 tokens de IA** | **-100% tokens** |

---

## 6. Gestión del Ciclo de Vida y Limpieza (Garbage Collection)

- **Eliminación Automática**: Al completarse la tarea y realizarse el merge, el worktree y la rama temporal se eliminan de inmediato con `git worktree remove --force`.
- **Recolección Preventiva**: Cada vez que arranca el orquestador, se ejecuta `git worktree prune` para purgar directorios huérfanos generados por interrupciones abruptas previas.
- **Opción de Retención**: Mediante la configuración `keep_on_fail: true`, es posible conservar el directorio de trabajo en caso de error para realizar inspecciones manuales.

---

## 7. Verificación de Calidad y Pruebas

El sistema incluye una suite de pruebas unitarias deterministas verificables con `pytest`:

```bash
.venv/bin/pytest -v
```

Cubre la resolución de arneses, persistencia en SQLite, ruteo con fallback, sincronización de decisiones y ciclo de vida de Git worktrees con una tasa de éxito del 100%.
