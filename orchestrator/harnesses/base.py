"""Abstract Base Harness Adapter for CLI agents."""

from abc import ABC, abstractmethod
from typing import Optional


class BaseHarnessAdapter(ABC):
    """Adapter interface to run different agent CLIs in a unified manner."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the harness (e.g. pi, opencode, claude)."""
        pass

    @abstractmethod
    def build_command(
        self,
        agent: str,
        prompt: str,
        worktree_path: str,
        model: Optional[str] = None,
        thinking: Optional[str] = None,
        max_turns: int = 10,
    ) -> list[str]:
        """Construct the CLI command list to execute."""
        pass

    @abstractmethod
    def get_executable_path(self) -> str:
        """Return the resolved path to the CLI binary."""
        pass
