"""Harness Detector and MCP Auto-Installer for Pinky Smart Orchestrator."""

import json
import os
import shutil
from pathlib import Path


def _resolve_pinky_cmd() -> str:
    """Return the absolute path to the pinky executable if available, or fallback to 'pinky'."""
    cmd = shutil.which("pinky")
    if cmd:
        return str(Path(cmd).resolve())
    local_bin = Path.home() / ".local" / "bin" / "pinky"
    if local_bin.exists():
        return str(local_bin.resolve())
    venv_bin = Path(__file__).resolve().parent.parent / ".venv" / "bin" / "pinky"
    if venv_bin.exists():
        return str(venv_bin.resolve())
    return "pinky"


def safe_merge_mcp_config(config_file: Path, command: str = "pinky") -> bool:
    """Safely merge the pinky MCP server into an existing or new MCP configuration JSON file.

    Never deletes existing configuration or other tools.
    """
    config_file.parent.mkdir(parents=True, exist_ok=True)
    data = {}

    if config_file.exists():
        try:
            content = config_file.read_text(encoding="utf-8").strip()
            if content:
                data = json.loads(content)
        except Exception:
            # Backup corrupted file
            backup = config_file.with_suffix(".json.bak")
            shutil.copyfile(config_file, backup)
            data = {}

    if not isinstance(data, dict):
        data = {}

    mcp_servers = data.setdefault("mcpServers", {})
    if not isinstance(mcp_servers, dict):
        mcp_servers = {}
        data["mcpServers"] = mcp_servers

    # Add or update pinky server
    mcp_servers["pinky"] = {
        "command": command,
        "args": ["mcp"],
    }

    config_file.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return True


def inject_agent_rules(project_root: Path) -> bool:
    """Inject Pinky orchestrator usage rule into AGENTS.md in the project root."""
    agents_file = project_root / "AGENTS.md"
    marker_start = "<!-- pinky:mcp:start -->"
    marker_end = "<!-- pinky:mcp:end -->"

    rule_content = f"""{marker_start}
## Pinky Multi-Agent Orchestrator (Autonomous Task Protocol)
When asked to perform architecture design, refactorings, multi-agent builds, or deterministic code verification:
- You MUST invoke the MCP tool `orchestrate_task(prompt="...")` from the `pinky` MCP server.
- Pinky manages specialized subagents (`sheldon`, `homero`, `tio-bob`, `edna`) in isolated Git worktree sandboxes with local Laya-API zero-token routing.
- Use `approve_task(task_id="...")` to confirm pending architecture blueprints.
- Do NOT run multi-file edits directly when Pinky is available to orchestrate them safely.
{marker_end}
"""

    if agents_file.exists():
        text = agents_file.read_text(encoding="utf-8")
        if marker_start in text and marker_end in text:
            # Replace existing section
            pre = text.split(marker_start)[0]
            post = text.split(marker_end)[1]
            agents_file.write_text(pre.rstrip() + "\n\n" + rule_content.strip() + "\n\n" + post.lstrip(), encoding="utf-8")
        else:
            # Append to existing
            agents_file.write_text(text.rstrip() + "\n\n" + rule_content.strip() + "\n", encoding="utf-8")
    else:
        # Create new AGENTS.md
        header = "# Project Agent Invariants & Guidelines\n\n"
        agents_file.write_text(header + rule_content.strip() + "\n", encoding="utf-8")

    return True


def _is_harness_installed(harness_id: str, path: Path, proj_dir: Path, home_dir: Path) -> bool:
    """Return True ONLY if the corresponding IDE or agent harness is actually installed."""
    if harness_id == "cursor_project":
        return (proj_dir / ".cursor").is_dir()
    elif harness_id == "cursor_global":
        return (
            (home_dir / ".cursor" / "mcp.json").exists()
            or Path("/Applications/Cursor.app").exists()
            or bool(shutil.which("cursor"))
        )
    elif harness_id == "vscode_project":
        return (proj_dir / ".vscode").is_dir()
    elif harness_id == "vscode_global":
        return (
            (home_dir / ".vscode" / "mcp.json").exists()
            or Path("/Applications/Visual Studio Code.app").exists()
            or bool(shutil.which("code"))
        )
    elif harness_id == "pi":
        return (home_dir / ".pi" / "agent").is_dir() or bool(shutil.which("pi"))
    elif harness_id == "omp":
        return (home_dir / ".omp" / "agent").is_dir() or bool(shutil.which("omp"))
    elif harness_id == "opencode":
        return (home_dir / ".opencode").is_dir() or bool(shutil.which("opencode"))
    elif harness_id == "claude_desktop":
        return (
            path.exists()
            or Path("/Applications/Claude.app").exists()
            or (home_dir / "Library" / "Application Support" / "Claude").is_dir()
        )
    elif harness_id == "claude_cli":
        return path.exists() or bool(shutil.which("claude"))
    elif harness_id == "antigravity":
        return (home_dir / ".gemini" / "config").is_dir()
    return False


def scan_and_configure_all(project_dir: Path | None = None) -> list[str]:
    """Scan the system and current project for installed harnesses, configuring MCP ONLY in detected ones."""
    configured: list[str] = []
    proj = (project_dir or Path.cwd()).resolve()
    home = Path.home()
    pinky_cmd = _resolve_pinky_cmd()

    # Target harness detection matrix: (id, display_name, config_path)
    targets: list[tuple[str, str, Path]] = [
        ("cursor_project", "Cursor (Project)", proj / ".cursor" / "mcp.json"),
        ("cursor_global", "Cursor (Global)", home / ".cursor" / "mcp.json"),
        ("vscode_project", "VS Code (Project)", proj / ".vscode" / "mcp.json"),
        ("vscode_global", "VS Code (Global)", home / ".vscode" / "mcp.json"),
        ("pi", "Pi Agent (Global)", home / ".pi" / "agent" / "mcp.json"),
        ("omp", "Oh My Pi / OMP (Global)", home / ".omp" / "agent" / "mcp.json"),
        ("opencode", "OpenCode (Global)", home / ".opencode" / "mcp.json"),
        ("claude_desktop", "Claude Desktop (Global)", home / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json"),
        ("claude_cli", "Claude Config (~/.claude.json)", home / ".claude.json"),
        ("antigravity", "Antigravity Core (Global)", home / ".gemini" / "config" / "mcp_config.json"),
    ]

    for harness_id, name, path in targets:
        if _is_harness_installed(harness_id, path, proj, home):
            try:
                safe_merge_mcp_config(path, command=pinky_cmd)
                configured.append(f"{name}: {path}")
            except Exception:
                pass

    # Inject rules into AGENTS.md in project directory if it is a git repository or AGENTS.md exists
    if (proj / "AGENTS.md").exists() or (proj / ".git").is_dir():
        try:
            inject_agent_rules(proj)
            configured.append(f"AGENTS.md: {proj / 'AGENTS.md'}")
        except Exception:
            pass

    return configured
