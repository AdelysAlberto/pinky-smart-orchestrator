"""Tests for Pinky MCP Server tools."""

import pytest
from orchestrator.mcp_server import approve_task, get_task_status, list_tasks, orchestrate_task


@pytest.mark.asyncio
async def test_mcp_list_and_status():
    result = await list_tasks()
    assert isinstance(result, str)


@pytest.mark.asyncio
async def test_mcp_approve_unknown_task():
    result = await approve_task(task_id="NON_EXISTENT", approved=True)
    assert "No se encontró" in result
