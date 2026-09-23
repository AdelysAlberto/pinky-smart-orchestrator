"""Unit tests for Harness Detector and MCP Installer."""

import json
import tempfile
from pathlib import Path
from orchestrator.installer import inject_agent_rules, safe_merge_mcp_config


def test_safe_merge_preserves_existing_servers():
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "mcp.json"
        initial_data = {
            "mcpServers": {
                "existing_tool": {
                    "command": "node",
                    "args": ["server.js"],
                }
            }
        }
        config_path.write_text(json.dumps(initial_data, indent=2))

        # Merge pinky
        result = safe_merge_mcp_config(config_path, command="pinky")
        assert result is True

        # Verify existing tool was not deleted
        updated = json.loads(config_path.read_text())
        servers = updated["mcpServers"]
        assert "existing_tool" in servers
        assert "pinky" in servers
        assert servers["pinky"]["command"] == "pinky"
        assert servers["pinky"]["args"] == ["mcp"]


def test_safe_merge_creates_new_file_if_missing():
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "nested" / "mcp.json"
        assert not config_path.exists()

        result = safe_merge_mcp_config(config_path, command="pinky")
        assert result is True
        assert config_path.exists()

        data = json.loads(config_path.read_text())
        assert "pinky" in data["mcpServers"]


def test_inject_agent_rules_idempotent():
    with tempfile.TemporaryDirectory() as tmpdir:
        proj_dir = Path(tmpdir)
        # 1. First injection
        inject_agent_rules(proj_dir)
        agents_file = proj_dir / "AGENTS.md"
        assert agents_file.exists()
        text_1 = agents_file.read_text()
        assert "Pinky Multi-Agent Orchestrator" in text_1

        # 2. Second injection should update without duplicating
        inject_agent_rules(proj_dir)
        text_2 = agents_file.read_text()
        assert text_2.count("<!-- pinky:mcp:start -->") == 1
