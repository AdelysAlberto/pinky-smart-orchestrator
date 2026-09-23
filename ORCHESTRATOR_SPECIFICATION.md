# Sistema de Orquestación Agéntica Ligera (Sin Docker) con Laya-API
## Especificación Arquitectónica y Operativa

---

## 1. Visión del Sistema y Principios Rectores

El Orquestador en `pi-py` es una plataforma agéntica de alto rendimiento que elimina totalmente Docker y máquinas virtuales. Su arquitectura se fundamenta en cuatro pilares:
1. **Sandbox Nativo sin Docker**: Emplea **Git Worktrees y subprocesos aislados del host**. Inicialización instantánea (< 50 ms), cero consumo de memoria por virtualización y protección total de la rama principal (`develop`).
2. **Clasificación Local Laya-API (0 Tokens)**: Evalúa cada requerimiento en ~30 ms mediante `laya-api` (local en Apple Silicon con MPS), decidiendo si la tarea amerita el pipeline completo o un despacho rápido a un único especialista.
3. **Optimización Extrema de Tokens**: Ahorro de hasta el 75% de tokens mediante Fast-Path, modelos graduados por nivel de esfuerzo (`low` vs `high`), aislamiento Clean-Slate en memoria e ingesta semántica con Cogni.
4. **Control Dual Concurrente**: Operación intercambiable desde la terminal CLI o desde el Dashboard Web sin bloqueo mutuo.
5. **Arquitectura Agnóstica de Arneses**: Soporte nativo para `pi`, `opencode` y `claude` a través de adaptadores intercambiables.

> Documentación de usuario y guía operativa completa disponible en [DOCUMENTACION_TECNICA.md](file:///Volumes/Datos/Projects/pi/pi-py/DOCUMENTACION_TECNICA.md).

---

## 2. El Sandbox Nativo: ¿Cómo funciona sin Docker?

En lugar de montar contenedores pesados que demandan demonios y generan incompatibilidad de binarios en `node_modules` (macOS vs Linux):

```
Repositorio Principal: /Volumes/Datos/Projects/mi-app (Rama: develop)
                       │
                       │ git worktree add
                       ▼
Sandbox Efímero: .pinky/worktrees/TASK-101/ (Rama: pinky/TASK-101)
- Espacio de archivos 100% independiente.
- Los binarios locales (bun, node, biome) funcionan nativamente.
- Pi / OpenCode / Claude CLI corre con cwd=.pinky/worktrees/TASK-101.
- Si un test falla o el código se rompe, develop permanece intacto.
                       │
                       │ Si la verificación pasa:
                       ▼
Merge limpio a develop y git worktree remove.
```

---

## 3. Estrategia de Contención de Tokens (5 Barreras)

| Mecanismo | Cómo opera | Impacto en Tokens |
| :--- | :--- | :--- |
| **1. Ruteo Local con Laya-API** | Evalúa en 30 ms en el puerto 8090. Si `scope: single`, omite a Sheldon y a Tio Bob. Va directo a Homero. | **-60% a -75% de tokens** en bugs y fixes puntuales. |
| **2. Model Tiering por Esfuerzo** | Si Laya indica `effort: low`, inyecta un modelo ligero (ej. `deepseek-flash`) con `thinking: low`. Reserva modelos fuertes para `effort: high`. | **-80% de costo por token** en tareas triviales. |
| **3. Aislamiento Clean Slate** | Cada subproceso arranca con sesión limpia en memoria. No arrastra historial previo ni mensajes acumulados. | **Evita la bola de nieve** de 50k-100k tokens en chats largos. |
| **4. Ingesta Quirúrgica de Cogni** | Inyecta solo 15 líneas con las reglas exactas de la tarea en `.pinky_context.md`. | Evita que el agente lea decenas de archivos de documentación. |
| **5. Límite Duro de Turnos** | `maxTurns: 10` por especialista. Si entra en bucle, el orquestador lo aborta. | Protege contra fugas de tokens por bucles infinitos. |

---

## 4. Flujo de Decisión: Fast-Path vs Full-Pipeline

```
[Petición del Usuario] ──► laya-api (Local: 30 ms, 0 Tokens)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [scope == single]              [scope == plan_and_build]
          FAST PATH                        FULL PIPELINE
                 │                               │
                 ▼                               ▼
        @homero (Worktree)             @sheldon (Worktree)
        Modelo: Flash / Low             Modelo: Pro / High
        Resuelve y prueba               Genera plan/TASK.md
                 │                               │
                 ▼                               ▼
          Tests Verdes?                 PUERTA DE APROBACIÓN
                 │                      (Terminal CLI o Dashboard Web)
                 ▼                               │
          Merge a develop                        ▼
                                       @homero: Construye
                                                 │
                                                 ▼
                                       @tio-bob: Revisa diff
                                                 │
                                                 ▼
                                       Cogni Save + Merge a develop
```

---

## 5. Control Dual: CLI y Dashboard Web

1. Al llegar a una puerta de aprobación, el orquestador dispara concurrentemente:
   - **Terminal**: `[?] Plan generado en plan/TASK.md. ¿Aprobar? [s/n]: `
   - **Web**: Notificación WebSocket con habilitación del botón `Aprobar`.
2. Una llamada en cualquiera de los dos canales resuelve el evento y permite que la cola FIFO prosiga inmediatamente.
3. El dashboard web se sirve localmente vía FastAPI en `http://127.0.0.1:8765`, ofreciendo consola PTY con soporte ANSI y visor de Markdown sincronizado en tiempo real.
