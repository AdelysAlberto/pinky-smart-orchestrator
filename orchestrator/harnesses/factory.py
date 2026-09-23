"""Factory to instantiate and retrieve CLI harness adapters."""

from orchestrator.harnesses.base import BaseHarnessAdapter
from orchestrator.harnesses.pi_adapter import PiHarnessAdapter
from orchestrator.harnesses.opencode_adapter import OpenCodeHarnessAdapter
from orchestrator.harnesses.claude_adapter import ClaudeHarnessAdapter

_REGISTRY: dict[str, type[BaseHarnessAdapter]] = {
    "pi": PiHarnessAdapter,
    "opencode": OpenCodeHarnessAdapter,
    "claude": ClaudeHarnessAdapter,
}


def get_harness_adapter(name: str) -> BaseHarnessAdapter:
    """Return an instance of the requested harness adapter."""
    adapter_cls = _REGISTRY.get(name.lower().strip())
    if not adapter_cls:
        # Default fallback to Pi
        return PiHarnessAdapter()
    return adapter_cls()
