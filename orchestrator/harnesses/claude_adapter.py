"""Claude Code CLI Adapter."""

import shutil
from pathlib import Path
from typing import Optional
from orchestrator.config import config
from orchestrator.harnesses.base import BaseHarnessAdapter


class ClaudeHarnessAdapter(BaseHarnessAdapter):
    """Adapter for Claude Code CLI."""

    @property
    def name(self) -> str:
        return "claude"

    def get_executable_path(self) -> str:
        resolved = shutil.which("claude")
        if resolved:
            return resolved
        claude_bin = Path("/Users/adelysalberto/.local/bin/claude")
        if claude_bin.exists():
            return str(claude_bin)
        return "claude"

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

        # If agent file exists, inject instructions
        agent_file = config.agents_dir / f"{agent}.md"
        agent_instructions = ""
        if agent_file.exists():
            try:
                agent_instructions = f"=== SPECIALIST ROLE: {agent} ===\n" + agent_file.read_text()[:4000] + "\n\n"
            except Exception:
                pass

        full_prompt = f"{agent_instructions}Task:\n{prompt}"
        cmd.append(full_prompt)
        return cmd
