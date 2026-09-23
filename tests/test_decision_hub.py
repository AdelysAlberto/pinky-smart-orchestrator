"""Tests for Decision Hub multiplexing."""

import asyncio
import pytest
from orchestrator.decision_hub import DecisionHub


@pytest.mark.asyncio
async def test_decision_hub_resolution():
    hub = DecisionHub()
    task_id = "TASK-TEST-001"

    # Start waiting without terminal prompt
    wait_task = asyncio.create_task(
        hub.wait_for_decision(task_id=task_id, plan_path="plan/test.md", enable_cli_prompt=False)
    )

    await asyncio.sleep(0.05)
    assert hub.is_waiting(task_id)

    # Resolve from web
    resolved = hub.resolve(task_id, approved=True)
    assert resolved is True

    result = await wait_task
    assert result is True
    assert not hub.is_waiting(task_id)
