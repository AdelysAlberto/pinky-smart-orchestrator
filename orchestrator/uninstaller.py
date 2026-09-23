"""Uninstaller module for Pinky Smart Orchestrator."""

import json
import shutil
from pathlib import Path


def remove_mcp_from_json(config_file: Path, server_name: str = "pinky") -> bool:
    """Safely remove the pinky MCP server from an MCP JSON config file, preserving everything else."""
    if not config_file.exists():
        return False

    try:
        content = config_file.read_text(encoding="utf-8").strip()
        if not content:
            return False
        data = json.loads(content)
        if isinstance(data, dict) and "mcpServers" in data and isinstance(data["mcpServers"], dict):
            if server_name in data["mcpServers"]:
                del data["mcpServers"][server_name]
                config_file.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
                return True
    except Exception:
        pass
    return False


def perform_uninstall(remove_data: bool = False) -> list[str]:
    """Remove pinky binary, clean all MCP harness integrations, and clean data."""
    cleaned = []
    home = Path.home()

    # 1. Clean MCP configs across all harnesses
    harness_configs = [
        home / ".cursor" / "mcp.json",
        home / ".vscode" / "mcp.json",
        home / ".pi" / "agent" / "mcp.json",
        home / ".omp" / "agent" / "mcp.json",
        home / ".opencode" / "mcp.json",
        home / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json",
        home / ".claude.json",
        home / ".gemini" / "config" / "mcp_config.json",
        home / ".hermes" / "mcp.json",
        home / ".codeium" / "windsurf" / "mcp_config.json",
    ]

    for cfg in harness_configs:
        if remove_mcp_from_json(cfg):
            cleaned.append(f"MCP limpio en: {cfg}")

    # 2. Remove binary symlink
    bin_path = home / ".local" / "bin" / "pinky"
    if bin_path.exists():
        bin_path.unlink(missing_ok=True)
        cleaned.append(f"Binario eliminado: {bin_path}")

    # 3. Remove runtime data if requested
    if remove_data:
        target_dir = home / ".pinky"
        if target_dir.exists():
            shutil.rmtree(target_dir, ignore_errors=True)
            cleaned.append(f"Directorio de datos eliminado: {target_dir}")

    return cleaned
