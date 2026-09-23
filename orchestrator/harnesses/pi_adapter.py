"""Pi Coding Agent CLI Adapter."""

import shutil
from pathlib import Path
from typing import Optional
from orchestrator.config import config
from orchestrator.harnesses.base import BaseHarnessAdapter


class PiHarnessAdapter(BaseHarnessAdapter):
    """Adapter for the official Pi Coding Agent CLI."""

    @property
    def name(self) -> str:
        return "pi"

    def get_executable_path(self) -> str:
        resolved = shutil.which("pi")
        if resolved:
            return resolved
        local_bin = Path("/Users/adelysalberto/.local/bin/pi")
        if local_bin.exists():
            return str(local_bin)
        return "pi"

    def build_command(
        self,
        agent: str,
        prompt: str,
        worktree_path: str,
        model: Optional[str] = None,
        thinking: Optional[str] = None,
        max_turns: int = 10,
    ) -> list[str]:
        cmd = [self.get_executable_path(), "-p"]

        if thinking:
            cmd.extend(["--thinking", thinking])

        if model:
            cmd.extend(["--model", model])

        # Point to the agent definition if it exists in agents-smart
        agent_file = config.agents_dir / f"{agent}.md"
        if agent_file.exists():
            cmd.extend(["--prompt-template", str(agent_file)])

        # Append final prompt
        cmd.append(prompt)
        return cmd
