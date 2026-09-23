"""Process Runner using PTY for unbuffered real-time log streaming."""

import asyncio
import os
import pty
from pathlib import Path
from typing import Callable, Coroutine, Optional
from orchestrator.harnesses.base import BaseHarnessAdapter


class AgentRunner:
    """Executes harness CLI in a pseudo-terminal (PTY) and streams ANSI stdout in real time."""

    async def run(
        self,
        harness: BaseHarnessAdapter,
        agent: str,
        prompt: str,
        worktree_path: Path,
        model: Optional[str] = None,
        thinking: Optional[str] = None,
        max_turns: int = 10,
        on_chunk: Optional[Callable[[str], Coroutine]] = None,
    ) -> int:
        """Execute command in PTY, streaming output chunks asynchronously."""
        cmd = harness.build_command(
            agent=agent,
            prompt=prompt,
            worktree_path=str(worktree_path),
            model=model,
            thinking=thinking,
            max_turns=max_turns,
        )

        # Open pseudo-terminal pair for unbuffered interactive streaming
        master_fd, slave_fd = pty.openpty()

        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["FORCE_COLOR"] = "1"

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            cwd=str(worktree_path),
            env=env,
            close_fds=True,
        )
        os.close(slave_fd)

        loop = asyncio.get_event_loop()
        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        await loop.connect_read_pipe(lambda: protocol, os.fdopen(master_fd, "rb", buffering=0))

        try:
            while True:
                line = await reader.read(1024)
                if not line:
                    break
                text = line.decode("utf-8", errors="replace")
                if on_chunk:
                    await on_chunk(text)
        except Exception:
            pass
        finally:
            await proc.wait()

        return proc.returncode or 0
