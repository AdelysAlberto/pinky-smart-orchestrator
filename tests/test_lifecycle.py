"""Unit tests for Updater and Uninstaller."""

import json
import tempfile
from pathlib import Path
import pytest
from orchestrator.uninstaller import remove_mcp_from_json
from orchestrator.updater import check_updates


def test_remove_mcp_from_json():
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg = Path(tmpdir) / "mcp.json"
        data = {
            "mcpServers": {
                "pinky": {"command": "pinky"},
                "other_tool": {"command": "node"},
            }
        }
        cfg.write_text(json.dumps(data, indent=2))

        # Remove pinky
        removed = remove_mcp_from_json(cfg, server_name="pinky")
        assert removed is True

        updated = json.loads(cfg.read_text())
        assert "pinky" not in updated["mcpServers"]
        assert "other_tool" in updated["mcpServers"]


@pytest.mark.asyncio
async def test_check_updates():
    current, latest, has_update = await check_updates()
    assert isinstance(current, str)
    assert isinstance(has_update, bool)
