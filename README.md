<p align="center">
  <img src="assets/pinky-logo.svg" width="150" height="150" alt="Pinky Smart Orchestrator" />
</p>

<h1 align="center">Pinky Smart Orchestrator</h1>

<p align="center">
  <b>Framework universal de orquestación y estandarización multiagente</b><br>
  <i>Potencia tus asistentes de programación con roles especializados, reglas de dominio, skills modulares y verificación determinista en los principales entornos agénticos.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-2.0.7-blue.svg?style=for-the-badge" alt="Versión">
  <img src="https://img.shields.io/badge/Plataforma-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg?style=for-the-badge" alt="Plataforma">
  <img src="https://img.shields.io/badge/Runtime-Node.js%20%7C%20Bun-orange.svg?style=for-the-badge" alt="Runtime">
  <img src="https://img.shields.io/badge/Licencia-MIT-green.svg?style=for-the-badge" alt="Licencia">
</p>

---

## Descripción general

**Pinky Smart Orchestrator** es un framework universal diseñado para estandarizar, orquestar y elevar el rendimiento de asistentes de programación autónomos. Une la potencia bruta de los modelos de lenguaje (LLM) con los estándares más rigurosos de ingeniería de software, proporcionando agentes aislados por dominio, reglas de ingeniería universales y paquetes de skills modulares.

En lugar de depender de prompts monolíticos, Pinky impone una separación estricta de responsabilidades entre Arquitectura, Construcción táctica, Diseño UX/UI, Auditoría de seguridad, Revisión de código, Estrategia fiscal/financiera y Cumplimiento legal. Cada rol opera dentro de límites estrictos, garantizando cero falsos positivos y entregables verificables en terminal.

---

## Problema que resuelve

- **Contaminación y desvío de contexto**: Elimina los prompts gigantescos mediante la carga diferida (*lazy loading*) de reglas de dominio y skills modulares bajo demanda.
- **Desviación arquitectónica**: Impide que los agentes constructores tomen decisiones de diseño de sistemas no autorizadas sin planos técnicos explícitos.
- **Criterios de calidad inconsistentes**: Establece verificaciones deterministas obligatorias antes de marcar cualquier tarea como completada (`bun test`, `biome check`, `typecheck`).
- **Fragmentación multiherramienta**: Un único paquete unificado que instala y sincroniza configuraciones sin fricción en Pi, Claude Code, Codex, OpenCode y Google Antigravity.

---

## Características principales

- **CLI interactivo y navegable**: Interfaz de terminal con navegación mediante flechas (`↑`/`↓`), filtrado de búsqueda en tiempo real e instalación individual o múltiple por entorno.
- **Soporte nativo multiplataforma**: Instalación automatizada y configuración persistente del `$PATH` para macOS, Linux, WSL y Windows nativo (PowerShell/CMD).
- **Runtime sin dependencias externas**: Construido con módulos ESM nativos sin necesidad de pasos previos con `npm install`.
- **8 roles de agentes especializados**: Clara separación de responsabilidades entre planificación estratégica, construcción, artesanía visual, seguridad y filtros de calidad.
- **57+ skills modulares para agentes**: Paquetes estandarizados `SKILL.md` que cubren arquitectura, bases de datos, frontend moderno, desarrollo móvil nativo, estilos, testing y cumplimiento normativo.
- **Automatización de releases semánticos**: Script integrado (`release.sh`) para publicación automatizada de versiones `patch`, `minor` y `major` con etiquetas en GitHub.

---

## Entornos compatibles y recursos globales

Pinky utiliza una arquitectura de doble capa: una **capa global compartida** (`~/.agents/`) para políticas de ingeniería y skills modulares comunes, junto con **configuraciones específicas por entorno** para el enrutamiento de agentes y adaptadores de herramientas.

### Directorio global compartido (`~/.agents/`)

| Recurso | Directorio de destino | Descripción | Método de instalación |
| :--- | :--- | :--- | :--- |
| **Políticas de ingeniería** | `~/.agents/policies/` | Invariantes, puertas de verificación, reglas de frontend, backend y móvil. | **Por defecto** (Siempre instalado, reemplaza existentes) |
| **Skills para agentes** | `~/.agents/skills/` | 57+ skills modulares bajo el estándar universal de Agent Skills. | **Confirmación interactiva** (Opcional [S/n], reconocido por todos los entornos) |

> **Ubicación en cada sistema operativo:**
> - **macOS / Linux**: `$HOME/.agents/` (`/Users/<user>/.agents` o `/home/<user>/.agents`)
> - **Windows**: `%USERPROFILE%\.agents` (ej. `C:\Users\<user>\.agents`)

### Entornos de agentes soportados

| Entorno | Plataforma / Sistema | Directorio de destino | Archivos principales |
| :--- | :--- | :--- | :--- |
| **Pi** | Pi Coding Agent (`pi-subagents`) | `~/.pi/agent/` | `AGENTS.md`, `APPEND_SYSTEM.md`, `settings.json`, `mcp.json`, `agents/`, `extensions/`, `prompts/` |
| **Claude Code** | Anthropic Claude Code CLI | `~/.claude/` | `CLAUDE.md`, `settings.json`, `agents/`, `rules/` |
| **OpenAI Codex** | OpenAI Codex CLI / Entorno | `~/.codex/` | `AGENTS.md`, `config.toml`, `agents/`, `rules/` |
| **OpenCode** | OpenCode Autonomous Agent | `~/.config/opencode/` | `AGENTS.md`, `opencode.json`, `agents/`, `rules/`, `commands/` |
| **Google Antigravity** | Antigravity IDE y Antigravity 2.0 | `~/.gemini/config/` | `GEMINI.md`, `config/AGENTS.md`, `config/agents/`, `config/rules/` |

> **Nota para Pi en Windows:** En sistemas Windows, la carpeta de configuración global de Pi se ubica en `%USERPROFILE%\.pi\agent\` (ej. `C:\Users\<user>\.pi\agent`). Pinky detecta y normaliza esta ruta automáticamente. Las skills de Pi se reconocen de forma nativa desde `~/.agents/skills/`.

---

## Inicio rápido e instalación

### macOS, Linux y WSL (Bash / Zsh)

Ejecuta el siguiente comando instalador en tu terminal:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/AdelysAlberto/pinky-smart-orchestrator/main/install.sh)
```

### Windows (PowerShell)

Ejecuta el siguiente comando en PowerShell:

```powershell
irm https://raw.githubusercontent.com/AdelysAlberto/pinky-smart-orchestrator/main/install.ps1 | iex
```

El instalador despliega automáticamente el ejecutable global `pinky` en `~/.local/bin/pinky` (Unix) o `pinky.cmd` / `pinky.ps1` (Windows) y asegura que esté disponible en la variable `$PATH` del sistema.

---

## Guía de uso y comandos

Una vez instalado, el comando `pinky` está disponible globalmente en cualquier sesión de terminal:

| Comando | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `pinky` | Inicia el menú interactivo en terminal para seleccionar e instalar entornos. | `pinky` |
| `pinky install <entorno>` | Instala directamente el paquete en un entorno específico (`pi`, `claude`, `codex`, `opencode`, `antigravity`, `all`). | `pinky install pi` |
| `pinky pi-addons` | Instala los paquetes y extensiones recomendadas para Pi (`pi-subagents`, `pi-web-access`, etc.). | `pinky pi-addons` |
| `pinky herdr` | Instala el panel Herdr, integraciones de agentes (`pi`, `claude`, `opencode`) y la skill global. | `pinky herdr` |
| `pinky upgrade` | Descarga las últimas actualizaciones de Pinky Core desde GitHub y sincroniza todos los entornos activos. | `pinky upgrade` |
| `pinky status` | Muestra el estado de todos los entornos configurados y sus rutas de instalación. | `pinky status` |
| `pinky version` | Muestra la versión actual instalada, el hash del commit de Git y el directorio core. | `pinky version` |
| `pinky help` | Imprime la guía de uso completa y la referencia de comandos. | `pinky help` |

### Navegación del menú interactivo

- **Teclas de flecha (`↑` / `↓`)**: Desplazarse por la lista de entornos.
- **Enter**: Confirmar la selección y proceder con la instalación.
- **Escribir texto**: Búsqueda y filtrado instantáneo en tiempo real.
- **Números (`1-6`)**: Selección directa por índice numérico.
- **Ctrl+C**: Cancelar la operación de forma segura.

---

## Panel multiagente y multiplexor (Herdr)

[Herdr](https://herdr.dev/) es un gestor de paneles y multiplexor para terminal diseñado para orquestar y supervisar múltiples sesiones de agentes CLI en paralelo (Pi, OpenCode, Claude Code).

> [!NOTE]
> Para comprender en detalle su funcionamiento y flujo de trabajo, recomendamos leer el artículo de referencia:  
> [WebReactivA: Herdr para desarrolladores](https://www.webreactiva.com/blog/herdr)

Es posible instalarlo de forma interactiva y guiada mediante Pinky CLI en cualquier sistema operativo:

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
  *Si las políticas de seguridad de Windows bloquean comandos PowerShell en memoria, ejecute en Command Prompt (CMD):*
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
npx skills add ogulcancelik/herdr --skill herdr -g -y
```

---

## VCD: Vertical-Contract Design

**Un patrón ágil de arquitectura agéntica de alta disciplina para ingeniería en producción**

*Macrovisión mediante un único PRD, rebanado vertical Just-In-Time, contratos validados por compilador y auditoría paralela de solo lectura.*

### 1. Contexto humano: Por qué nace VCD

El desarrollo asistido por agentes de inteligencia artificial comenzó imitando los peores vicios de la ingeniería de software clásica: el **Waterfall Documental**. Al implementar SDD (*Spec-Driven Development*) tradicional, obligamos a los agentes a escribir especificaciones exhaustivas de cientos o miles de líneas en Markdown antes de tocar una sola línea de código.

El resultado práctico fue demoledor:
- **Quema masiva de tokens**: Agentes arquitectos redactando interfaces de TypeScript y esquemas dentro de archivos `.md`, para que luego otro agente consumiera miles de tokens leyéndolos y transcribiéndolos a `.ts`.
- **Context Rot y desviación**: Contratos en Markdown que alucinaban librerías o desfasaban de la realidad del repositorio apenas se ejecutaba el segundo sprint.
- **Burocracia de archivos huérfanos**: Decenas de documentos intermedios (`plan/`, `specs/`, `design/`, `reviews/`) compitiendo como fuentes de la verdad frente al código real.
- **Sesgo del autor**: Agentes constructores que auditaban su propio código y se aprobaban a sí mismos malas decisiones de maquetación, antipatrones de capas o fallos de seguridad.

Por otro lado, propuestas como ODD (*Organic Driven Design*) o el Backlog Simple liberaron agilidad al grito de *"Keep small work small"*, pero en proyectos medianos o grandes dejaron vacíos de gobernanza: falta de contratos firmes, duplicación de layouts y pérdida de trazabilidad.

**VCD (Vertical-Contract Design)** nace para resolver esta tensión: conserva el rigor inflexible de la arquitectura limpia y la tipificación estricta, pero elimina la burocracia documental mediante rebanadas verticales entregadas Just-In-Time, donde el compilador valida gratis y la documentación se mantiene mínima, viva y trazable.

### 2. Definición técnica del patrón VCD

Vertical-Contract Design (VCD) es un patrón de diseño agéntico estructurado sobre cuatro pilares fundamentales:

```text
                      ┌────────────────────────────────────────┐
                      │     artifacts/prd/PROJECT_PRD.md       │
                      │  (Macrovisión y tabla de backlog)      │
                      └──────────────────┬─────────────────────┘
                                         │
                        [Rebanado vertical Just-In-Time]
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │  artifacts/backlog/<mod>/US-XX.md      │
                      │  (≤ 200 líneas: AC + Contrato + Tareas)│
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │    Tarea 1: Contrato primero en código │
                      │   (types/api/*.types.ts + typecheck)   │
                      └──────────────────┬─────────────────────┘
                                         │
                        [Checks estáticos: biome + tsc]
                                         │
                                         ▼
             ┌───────────────────────────┴───────────────────────────┐
             │         Tríada / Cuarteto de auditoría paralela       │
             │   (@tio-bob: Arq | @frink: Rend | @gorgory: Seg)      │
             │        (+ @edna: UX/UI si touches_ui: true)           │
             └───────────────────────────┬───────────────────────────┘
                                         │
                                 [Todos APPROVED]
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │        Único gate final determinista   │
                      │    (bun test ejecutado UNA vez al fin) │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       status: done (PRD e historia)    │
                      └────────────────────────────────────────┘
```

#### Los cuatro pilares de VCD:

1. **Macrovisión vs. ejecución micro (Just-In-Time)**:
   - **1 solo documento macro (`artifacts/prd/PROJECT_PRD.md`)**: Contiene la visión del sistema, el stack tecnológico aprobado, las fronteras de dominio y la tabla índice viva de todas las historias de usuario.
   - **Micro-historias de rebanada vertical (`artifacts/backlog/<modulo>/US-<ID>-<slug>.md`)**: Creadas Just-In-Time justo antes de construirse. Tamaño estricto ≤ 200 líneas de Markdown. Contienen criterios de aceptación observables, interfaz del contrato y tareas atómicas.

2. **Contratos validados por el compilador (Code-First Contracts)**:
   - La **Tarea 1** de cada historia SIEMPRE es el contrato de código real (`types/api/*.types.ts` o interfaz en el lenguaje destino).
   - El compilador (`tsc`, `biome check`, linters nativos) es el validador primario e implacable a coste cero de tokens. No se escriben contratos duplicados en Markdown.

3. **Tríada / Cuarteto de auditoría paralela de solo lectura**:
   - Los constructores nunca auditan su propio código.
   - Una vez finalizada la construcción por `@homero`, se ejecutan en paralelo agentes especializados de solo lectura:
     - `@tio-bob`: Arquitectura, Clean Code, Result Pattern, límites de capas y complejidad cognitiva.
     - `@frink`: Rendimiento en runtime (Push State Down, prevención de cascadas de re-renders, virtualización, hooks de TanStack Query, latencia de base de datos y N+1).
     - `@gorgory`: Seguridad y código muerto (OWASP, exposición de secretos, sanitización de inputs, rate limiting).
     - `@edna`: Artesanía visual y UX/UI (si `touches_ui: true`: tokens, jerarquía visual, feedback háptico/estados, accesibilidad).
   - Todos los auditores deben emitir veredicto `APPROVED` antes de que la historia pueda cerrarse.

4. **Único gate final determinista**:
   - La suite de pruebas de ejecución (`bun test`, tests de integración) se corre UNA sola vez al cierre de la historia, asegurando feedback rápido estático durante el ciclo y prueba funcional definitiva al final.
   - Actualización del estado a `done` tanto en la historia como en la tabla viva del PRD.

---

## Alineación de agentes especializados

| Agente | Rol | Responsabilidad | Modo |
| :--- | :--- | :--- | :--- |
| `@sheldon` | Arquitecto Jefe y PM | Descubrimiento de macrovisión, PRD maestro (`artifacts/prd/PROJECT_PRD.md`), rebanadas verticales JIT (`artifacts/backlog/<mod>/US-XX.md`) y orquestación de auditorías paralelas. | Solo lectura |
| `@homero` | Constructor táctico | Implementación de código de aplicación, construcción de componentes, corrección de bugs, refactorizaciones y suites de pruebas. | Lectura-Escritura |
| `@edna` | Diseñadora líder UX/UI | Flujos de interacción, tokens de diseño, arquitectura visual, ergonomía móvil y sistemas de diseño CSS (`artifacts/ux/`). | Lectura-Escritura |
| `@frink` | Científico de rendimiento | Cascadas de renderizado en React/RN, Push-State-Down, caché/estados de carga en TanStack Query, latencia de base de datos, EXPLAIN, índices y auditorías de N+1. | Solo lectura |
| `@gorgory` | Auditor de seguridad e higiene | Análisis de vulnerabilidades OWASP, detección de endpoints huérfanos, auditorías de exposición de secretos y eliminación de código muerto (`artifacts/security/`). | Solo lectura |
| `@tio-bob` | Revisor senior de código | Criterios de calidad Clean Code, verificación de invariantes arquitectónicos, inspección de PR/MR y validación de seguridad de integración. | Solo lectura |
| `@contador` | Estratega fiscal y financiero | Estructuración tributaria, IRPF, IVA, impuesto de sociedades y normativa financiera transfronteriza para España y la Unión Europea. | Solo lectura |
| `@saul` | Asesor legal y de cumplimiento | Cumplimiento normativo, RGPD/GDPR, AI Act de la UE, LSSI-CE, términos de servicio, licencias y propiedad intelectual. | Solo lectura |

---

## Invariantes universales de ingeniería

Todos los entornos configurados por Pinky cumplen estrictamente con los siguientes estándares técnicos:

1. **Paradigma funcional puro**: Evitar clases, jerarquías de herencia y estado mutable compartido cuando las funciones puras y la composición modular sean suficientes.
2. **Result Pattern**: Las fronteras de servicios y manejadores de red retornan tipos de unión discriminada (`{ success: true, data } | { success: false, error }`) en lugar de lanzar excepciones no capturadas.
3. **Disciplina en longitud de archivos**: Límite estricto de 250 líneas de código por archivo. Descomponer módulos complejos en subcomponentes y utilidades cohesivas.
4. **Rebanado vertical (Vertical Slicing)**: Bases de código organizadas por dominios de funcionalidades (`src/modules/<FeatureName>/`) en lugar de capas técnicas.
5. **Huella anti-IA**: Prohibición de emojis decorativos genéricos en código fuente, informes técnicos, mensajes de commit y documentación.
6. **Cero falsos positivos y rigor técnico (Anti-adulación)**:
   - **Honestidad intelectual sin complacencia**: Nunca validar premisas defectuosas o antipatrones por complacer al usuario. Cuestionar suposiciones inválidas con teoría y estándares establecidos.
   - **Investigación previa obligatoria**: Es obligatorio investigar el contexto antes de emitir conclusiones. Sin conjeturas ni respuestas superficiales de primer resultado.
   - **Evidencia empírica de ejecución**: Cada tarea completada debe superar verificaciones deterministas en terminal (`bun test`, `biome check`, `typecheck`).
7. **Salvaguardas para producción y bases de datos activas**: Operaciones estrictamente de solo lectura (`SELECT` únicamente) en bases de datos de producción. Cualquier modificación o acción destructiva en producción es innegociable y está prohibida.

---

## Catálogo de skills modulares

El paquete incluye skills modulares para agentes que cumplen con la especificación de **Agent Skills** (`SKILL.md`):

### Arquitectura y backend
- `backend-architecture`: Rebanado vertical, Result Pattern, registro estructurado de logs y estándares HTTP.
- `database-design`: Esquemas PostgreSQL, Drizzle ORM, migraciones, indexación y caché con Redis.
- `doc-database`: Optimización de consultas, planes de ejecución y límites de transacciones.
- `security-hardening`: Mitigación del Top 10 de OWASP, limitación de tasa (*rate limiting*) y sanitización defensiva de entradas.

### Frontend y desarrollo móvil
- `react-typescript-clean-code`: Clean Architecture, componentes puros y custom hooks para React 18/19+.
- `react-native-architecture`: Expo Router, Fabric/TurboModules, Reanimated 3 y optimización de Callstack.
- `mobile-native`: Guías HIG de iOS, Material Design 3, zonas seguras (*safe areas*), áreas táctiles y ergonomía gestual.
- `css-architecture`: CSS Modules, metodología BEM, jerarquías de design tokens y transiciones aceleradas por GPU.
- `zustand`: Gestión de estado con selectores atómicos (`useShallow`) y prevención de bucles de renderizado.
- `frontend-design`: Sistemas visuales distintivos, combinación tipográfica y diseño de paletas modernas.
- `i18n-localization`: Configuración de react-i18next, claves de traducción por espacios de nombres y propiedades lógicas RTL.

### Diseño y UX
- `ux-decision`: Razonamiento sistemático de UX, cuestionamiento de premisas y barrido completo de estados.
- `ux-wireframing`: Especificaciones de wireframes, flujos de usuario y estructuras de tokens visuales.
- `visual-craft`: Alineación óptica, radios de esquina concéntricos y modelos de elevación por sombras.
- `impeccable`: Pulido de frontend, refinamiento estético, robustez interactiva y elevación visual.
- `accessibility`: Cumplimiento WCAG 2.2 AA / Sección 508, captura de foco y semántica para lectores de pantalla.

### Calidad, auditoría y testing
- `auditor`: Inspección del estado del código, análisis de deuda técnica y descubrimiento de arquitectura.
- `gadget-auditor`: Eliminación de código muerto, detección de rutas huérfanas y auditoría de desvío semántico.
- `testing-strategy`: Pruebas unitarias, pruebas de integración con MSW y diagnóstico de cobertura.
- `house-testing`: Configuración de bancos de pruebas de diagnóstico y validación de casos límite.
- `tio-bob`: Protocolo de revisión de PR/MR, métricas de Clean Code y puertas de calidad en pull requests.

### Producto, negocio y estrategia
- `product-requirements`: Documentos de requisitos de producto (PRD), briefs y priorización MoSCoW.
- `market-research`: Análisis de competidores, benchmarks de paridad de características y matrices de posicionamiento.
- `growth-copywriting`: Frameworks de copywriting de conversión (AIDA, PAS, BAB, FAB).
- `tax-accounting`: Cálculos fiscales (IRPF, RETA, IS, IVA) para autónomos y sociedades en España/UE.
- `legal-compliance`: Cumplimiento legal europeo, RGPD, AI Act de la UE y licencias de software.
- `scrum-planning`: Desglose ágil de tareas, estimación de story points y grafos de dependencias.
- `linkedin`: Liderazgo de opinión técnico y narrativa de arquitectura en LinkedIn.
- `graphify`: Grafos de conocimiento persistentes a partir de bases de código y documentación.
- `cogni`: Memoria semántica autónoma y almacenamiento de firmas eficiente en tokens.
- `herdr`: Multiplexación de terminales multiagente, orquestación de paneles y comunicación IPC por sockets.

---

## Automatización de versiones

Para los mantenedores del repositorio, los lanzamientos semánticos automatizados se gestionan mediante [`release.sh`](release.sh):

```bash
# Modo interactivo (consulta la última etiqueta de Git y solicita el tipo de incremento)
./release.sh

# Incremento directo por CLI
./release.sh patch   # Incrementa PATCH (ej. v1.0.5 -> v1.0.6)
./release.sh minor   # Incrementa MINOR (ej. v1.0.5 -> v1.1.0)
./release.sh major   # Incrementa MAJOR (ej. v1.0.5 -> v2.0.0)
```

El script realiza las siguientes operaciones:
1. Consulta la última etiqueta de Git en referencias locales y remotas.
2. Actualiza la constante `VERSION` en `bin/pinky`.
3. Crea un commit convencional (`chore(release): vX.Y.Z`).
4. Genera una etiqueta anotada en Git.
5. Publica la rama y la etiqueta en el repositorio remoto.
6. Crea un release en GitHub mediante la CLI `gh` si está instalada y autenticada.

---

## Arquitectura del repositorio

```text
pinky-smart-orchestrator/
├── install.sh                  # Instalador universal para Unix (macOS/Linux/WSL)
├── install.ps1                 # Instalador nativo para Windows PowerShell
├── release.sh                  # Script de automatización de releases semánticos
├── bin/
│   ├── pinky                   # Ejecutable principal de Pinky CLI (ESM nativo para Node/Bun)
│   ├── pinky.cmd               # Script envoltorio para Command Prompt de Windows
│   └── pinky.ps1               # Script envoltorio para PowerShell de Windows
├── scripts/
│   └── installer.mjs           # Motor del CLI interactivo para selección de entornos
├── agents-globals/             # Recursos globales cross-harness (~/.agents/)
│   ├── policies/               # Invariantes y reglas de ingeniería (instalación por defecto)
│   └── skills/                 # Catálogo de 57+ Agent Skills (instalación interactiva)
├── agents-pi/                  # Suite completa para Pi Coding Agent (~/.pi/agent/)
│   ├── AGENTS.md               # Directivas globales de Pi
│   ├── APPEND_SYSTEM.md        # Contrato de operación adjunto al prompt de Pi
│   ├── settings.json           # Configuración global y subagentes
│   ├── mcp.json                # Servidores MCP nativos
│   ├── agents/                 # Subagentes especializados (@sheldon, @homero, etc.)
│   ├── extensions/             # Extensiones TypeScript de Pi
│   └── prompts/                # Plantillas y comandos /prompts
├── agents-claude/              # Paquete para Anthropic Claude Code (~/.claude/)
├── agents-codex/               # Paquete para OpenAI Codex (~/.codex/)
├── agents-opencode/            # Paquete para OpenCode CLI (~/.config/opencode/)
├── agents-antigravity/         # Paquete para Google Antigravity IDE y 2.0 (~/.gemini/)
├── main/                       # Plantillas maestras y documentación técnica
└── README.md                   # Documentación general y especificaciones
```

---

## Autor y mantenimiento

**Adelys Alberto Belen**  
Ingeniero de Software y Arquitecto Técnico  
- **GitHub**: [@AdelysAlberto](https://github.com/AdelysAlberto)  
- **Sitio web**: [adalbeca.com](https://adalbeca.com)  
- **Correo**: [dev@adalbeca.com](mailto:dev@adalbeca.com)  

---

## Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE).
