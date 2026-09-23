"""Cogni Semantic Memory Bridge for pre-flight context and post-flight learning."""

import asyncio
import shutil
from pathlib import Path


class CogniBridge:
    """Interfaces with Cogni CLI to inject and persist synthetic memory signatures."""

    def __init__(self):
        self.cogni_bin = shutil.which("cogni")

    async def ingest_context(self, prompt: str, worktree_path: Path) -> Path | None:
        """Search memory for relevant invariants and write them to .pinky_context.md."""
        if not self.cogni_bin:
            return None

        # Clean search terms from prompt
        search_query = " ".join(prompt.split()[:8])
        cmd = [self.cogni_bin, "search", search_query, "--limit", "4"]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode(errors="replace").strip()
            if output and "Se encontraron" in output:
                context_file = worktree_path / ".pinky_context.md"
                content = f"# Contexto Semántico Previo (Cogni)\n\n{output}\n"
                context_file.write_text(content, encoding="utf-8")
                return context_file
        except Exception:
            pass

        return None

    async def persist_signature(self, task_id: str, summary: str, tags: list[str] | None = None) -> bool:
        """Save high-signal architectural or bugfix discovery into Cogni."""
        if not self.cogni_bin:
            return False

        tag_list = ",".join(tags or ["pinky", "orchestrator", task_id])
        cmd = [
            self.cogni_bin,
            "save",
            "--topic",
            f"tasks/{task_id}",
            "--tags",
            tag_list,
            "--summary",
            summary[:500],
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
            return proc.returncode == 0
        except Exception:
            return False
