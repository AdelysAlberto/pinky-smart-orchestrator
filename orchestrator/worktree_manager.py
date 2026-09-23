"""Git Worktree Manager for Zero-Docker ephemeral sandboxing."""

import asyncio
import os
import shutil
from pathlib import Path
from orchestrator.config import config


class WorktreeManager:
    """Manages the creation, merge, and clean deletion of ephemeral Git worktrees."""

    def __init__(self, repo_root: Path | None = None):
        self.repo_root = repo_root or Path.cwd()
        self.worktrees_root = self.repo_root / config.worktrees_root
        self.worktrees_root.mkdir(parents=True, exist_ok=True)

    async def _run_git(self, args: list[str], cwd: Path | None = None) -> tuple[int, str, str]:
        cmd = ["git"] + args
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=cwd or self.repo_root,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        return (
            proc.returncode or 0,
            stdout.decode(errors="replace").strip(),
            stderr.decode(errors="replace").strip(),
        )

    async def create_worktree(self, task_id: str, base_branch: str | None = None) -> Path:
        """Create an isolated Git worktree for the task in milliseconds."""
        branch = base_branch or config.default_branch
        worktree_path = self.worktrees_root / task_id
        branch_name = f"pinky/{task_id}"

        # If worktree already exists, remove it first
        if worktree_path.exists():
            await self.cleanup_worktree(task_id)

        # Check if base branch exists, otherwise use current HEAD
        code, _, _ = await self._run_git(["rev-parse", "--verify", branch])
        start_point = branch if code == 0 else "HEAD"

        # Create worktree with dedicated branch
        code, stdout, stderr = await self._run_git(
            ["worktree", "add", "-b", branch_name, str(worktree_path), start_point]
        )
        if code != 0:
            # Fallback without -b if branch already exists
            code, stdout, stderr = await self._run_git(
                ["worktree", "add", str(worktree_path), branch_name]
            )
            if code != 0:
                raise RuntimeError(f"Failed to create git worktree: {stderr or stdout}")

        return worktree_path

    async def merge_and_remove(self, task_id: str, target_branch: str | None = None) -> bool:
        """Merge task branch into target branch, then destroy the worktree."""
        target = target_branch or config.default_branch
        branch_name = f"pinky/{task_id}"
        worktree_path = self.worktrees_root / task_id

        # Checkout target branch in main repo and merge
        code, _, stderr = await self._run_git(["checkout", target])
        if code != 0:
            # If not possible, keep branch but remove worktree
            pass
        else:
            await self._run_git(["merge", "--no-ff", "-m", f"feat(pinky): merge task {task_id}", branch_name])

        # Remove worktree
        await self.cleanup_worktree(task_id)
        return True

    async def cleanup_worktree(self, task_id: str) -> None:
        """Force delete the worktree directory and prune git metadata."""
        worktree_path = self.worktrees_root / task_id
        branch_name = f"pinky/{task_id}"

        if worktree_path.exists():
            await self._run_git(["worktree", "remove", "--force", str(worktree_path)])
            if worktree_path.exists():
                shutil.rmtree(worktree_path, ignore_errors=True)

        await self._run_git(["branch", "-D", branch_name])
        await self._run_git(["worktree", "prune"])

    async def prune_all(self) -> None:
        """Clean all orphaned worktrees from previous interrupted runs."""
        await self._run_git(["worktree", "prune"])
