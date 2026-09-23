"""Tests for Router Bridge and Laya fallback."""

import pytest
from orchestrator.models import ScopeType
from orchestrator.router_bridge import classify_prompt


@pytest.mark.asyncio
async def test_classify_prompt_fallback_when_offline():
    # Calling without active laya server should safely fallback without raising
    classification = await classify_prompt("Refactor database schema")
    assert classification is not None
    assert classification.scope in (ScopeType.PLAN_AND_BUILD, ScopeType.SINGLE)
    assert classification.latency_ms >= 0.0
