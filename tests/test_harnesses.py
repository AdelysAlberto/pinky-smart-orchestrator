"""Unit tests for Harness Adapters."""

from orchestrator.harnesses.factory import get_harness_adapter
from orchestrator.harnesses.pi_adapter import PiHarnessAdapter
from orchestrator.harnesses.opencode_adapter import OpenCodeHarnessAdapter
from orchestrator.harnesses.claude_adapter import ClaudeHarnessAdapter


def test_factory_resolves_all_harnesses():
    pi_harness = get_harness_adapter("pi")
    assert isinstance(pi_harness, PiHarnessAdapter)
    assert pi_harness.name == "pi"

    opencode_harness = get_harness_adapter("opencode")
    assert isinstance(opencode_harness, OpenCodeHarnessAdapter)
    assert opencode_harness.name == "opencode"

    claude_harness = get_harness_adapter("claude")
    assert isinstance(claude_harness, ClaudeHarnessAdapter)
    assert claude_harness.name == "claude"


def test_pi_command_builder():
    adapter = PiHarnessAdapter()
    cmd = adapter.build_command(
        agent="sheldon",
        prompt="Analyze system architecture",
        worktree_path="/tmp/worktree",
        model="deepseek-flash",
        thinking="low",
    )
    assert "-p" in cmd
    assert "--model" in cmd
    assert "deepseek-flash" in cmd
    assert "--thinking" in cmd
    assert "low" in cmd
    assert "Analyze system architecture" in cmd[-1]


def test_opencode_command_builder():
    adapter = OpenCodeHarnessAdapter()
    cmd = adapter.build_command(
        agent="homero",
        prompt="Fix unit test",
        worktree_path="/tmp/worktree",
    )
    assert "run" in cmd
    assert any("Fix unit test" in part for part in cmd)


def test_claude_command_builder():
    adapter = ClaudeHarnessAdapter()
    cmd = adapter.build_command(
        agent="tio-bob",
        prompt="Review git diff",
        worktree_path="/tmp/worktree",
    )
    assert "-p" in cmd
    assert any("Review git diff" in part for part in cmd)
