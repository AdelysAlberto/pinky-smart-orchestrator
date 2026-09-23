<h1 align="center">Pinky Smart Orchestrator</h1>

<p align="center">
  <b>Harness-Agnostic, Zero-Docker Multi-Agent Execution Engine</b><br>
  <i>Concurrent FIFO task coordination, instant Git worktree sandboxes, local System 1 routing via Laya-API, and native MCP protocol support.</i>
</p>

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.11%2B-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11+"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-2.2-purple.svg?style=for-the-badge" alt="MCP"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License"></a>
</p>

---

## Overview

**Pinky Smart Orchestrator** is an autonomous multi-agent task runner and supervisor designed to coordinate specialized AI coding specialists (`sheldon`, `homero`, `edna`, `tio-bob`).

Instead of running subagents within a single bloated process or relying on heavy virtualization containers (Docker/LXC), Pinky provisions **ephemeral Git worktrees** in under 50 ms. It evaluates tasks in 30 ms using local neural weights (**Laya-API**) at zero token cost, streams unbuffered ANSI terminal output via PTY over WebSockets, and exposes a native **Model Context Protocol (MCP)** interface for Cursor, VS Code, Pi, OpenCode, and Claude.

---

## What It Solves

- **Zero-Virtualization Overhead**: Eliminates Docker daemon dependency, container boot latencies (5–15s), and cross-platform native binary conflicts in `node_modules` (macOS vs Linux).
- **Branch Protection**: All agent executions occur inside isolated Git worktrees (`.pinky/worktrees/<task-id>`). The active `develop` branch remains completely untouched until verification passes.
- **Extreme Token Efficiency**: Uses local Laya-API classification to bypass architectural overhead for routine bugfixes (`scope: single`), saving up to 75% of API tokens.
- **Harness Portability**: Decouples prompts and agent workflows from any single runtime. Operates identically across Pi, OpenCode, and Claude Code.
- **Concurrent Dual Control**: Solves human-in-the-loop approval gates simultaneously across interactive terminal CLI prompts and a real-time dark-mode Web Dashboard.

---

## Key Features

- **Zero-Docker Sandboxes**: Ephemeral workspaces created with `git worktree add` and destroyed cleanly upon merge.
- **Local System 1 Routing (Laya-API)**: Evaluates `scope` (`single` vs `plan_and_build`), `domain` (`code`, `ux`, `review`, `security`), and `effort` (`low` vs `high`) in ~30 ms locally on Apple Silicon (MPS) without consuming LLM tokens.
- **Harness-Agnostic Adapters**: Native connectors for Pi (`pi -p`), OpenCode (`opencode run`), and Claude Code (`claude -p`).
- **Live PTY Telemetry Stream**: Pseudo-terminal process capture preserving ANSI color codes and interactive progress over WebSockets.
- **Persistent SQLite FIFO Queue**: Durable task pipeline tracking with pause and resume controls.
- **Cogni Memory Bridge**: Pre-flight semantic memory ingestion and post-flight structured signature persistence.
- **Universal MCP Auto-Installer (`pinky init`)**: Automatically detects and injects MCP server configurations across 11+ installed IDEs and agent harnesses without overwriting existing settings.

---

## Quick Start

### Automated Installation (One-Line Setup)

Install and auto-configure Pinky and all your installed harnesses (Cursor, VS Code, Pi, OpenCode, Claude, etc.) in one command:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/AdelysAlberto/pinky-smart-orchestrator/main/install.sh)
```

### Manual Installation (From Source)

```bash
# 1. Run local installer script
./install.sh

# Or install manually via pip:
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
pinky init
```

---

## Usage Reference

### Starting the Orchestrator Service & Web Dashboard

```bash
pinky start
```
The real-time Web Dashboard will be available at `http://127.0.0.1:8765`.

### Executing Tasks Directly from CLI

```bash
# Run with default harness (Pi)
pinky run "Refactor authentication service to Result pattern"

# Run with OpenCode harness
pinky run "Fix typing errors in models.py" --harness opencode

# Run with Claude Code harness
pinky run "Create unit tests for webhook handlers" --harness claude
```

### Inspecting Queue & Status

```bash
pinky list
```

---

## MCP Integration

Pinky includes a native Model Context Protocol (MCP) server over `stdio`. Run `pinky init` in your project to automatically configure your active IDEs and agent harnesses.

### Manual Configuration (`.cursor/mcp.json` / VS Code / Claude Desktop)

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

### Available MCP Tools

- **`orchestrate_task(prompt, harness)`**: Dispatches the task through the Pinky pipeline inside an isolated worktree.
- **`approve_task(task_id, approved)`**: Approves or rejects a pending architectural plan directly from the chat interface.
- **`get_task_status(task_id)`**: Returns detailed progress, active specialist step, and plan content.
- **`list_tasks()`**: Lists all active, queued, and completed tasks.

---

## Repository Architecture

```text
pinky-smart-orchestrator/
├── orchestrator/
│   ├── config.py           # Central configuration and effort model maps
│   ├── models.py           # Pydantic schemas for tasks, steps, and telemetry
│   ├── queue_engine.py     # SQLite FIFO queue coordinator
│   ├── worktree_manager.py # Ephemeral Git worktree lifecycle manager
│   ├── agent_runner.py     # PTY-based unbuffered ANSI streaming runner
│   ├── decision_hub.py     # Multiplexed CLI/Web human-in-the-loop resolver
│   ├── cogni_bridge.py     # Cogni semantic memory pre-flight and persistence
│   ├── router_bridge.py    # Local Laya-API classification client
│   ├── installer.py        # Multi-harness detector and safe MCP config merger
│   ├── mcp_server.py       # Official Model Context Protocol (MCP) server
│   ├── server.py           # FastAPI backend and WebSocket broadcaster
│   ├── cli.py              # CLI launcher (pinky run, start, list, mcp, init)
│   ├── harnesses/          # Pluggable CLI adapters (Pi, OpenCode, Claude)
│   │   ├── base.py
│   │   ├── pi_adapter.py
│   │   ├── opencode_adapter.py
│   │   ├── claude_adapter.py
│   │   └── factory.py
│   └── static/             # Real-time Web Dashboard (Split View)
│       ├── index.html
│       ├── app.js
│       └── styles.css
├── agents/                 # Embedded specialist definitions (Sheldon, Homero, Edna, Tio Bob)
├── rules/                  # System rules and engineering invariants
├── skills/                 # Specialized domain skill cheat-sheets
├── tests/                  # Deterministic test suite (13 tests)
├── install.sh              # Automated one-line installer script
├── pyproject.toml          # Package configuration and console entrypoints
├── requirements.txt        # Minimal Python dependencies
└── LICENSE                 # MIT License
```

---

## Verification & Testing

The repository includes a comprehensive deterministic unit test suite:

```bash
.venv/bin/pytest -v
```

All 13 tests validate harness factory resolution, queue persistence, PTY execution, router fallbacks, safe MCP configuration merging, and Git worktree lifecycles.

---

## Author & Maintenance

Maintained and designed by:

- **Adelys Alberto Belen** ([@AdelysAlberto](https://github.com/AdelysAlberto))
- Software Engineer & System Architect
- Website: [adalbeca.com](https://adalbeca.com)
- Contact: `dev@adalbeca.com`

---

## License

This project is licensed under the terms of the [MIT License](LICENSE).
