"""Tests for WorktreeManager in isolated temporary git repositories."""

import asyncio
import subprocess
import tempfile
from pathlib import Path
import pytest
from orchestrator.worktree_manager import WorktreeManager


@pytest.mark.asyncio
async def test_worktree_lifecycle():
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "test_repo"
        repo_dir.mkdir()

        # Initialize real git repo
        subprocess.run(["git", "init", "-b", "develop"], cwd=repo_dir, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@pinky.dev"], cwd=repo_dir, check=True)
        subprocess.run(["git", "config", "user.name", "Pinky Tester"], cwd=repo_dir, check=True)

        # Initial commit
        (repo_dir / "README.md").write_text("# Test Repo\n")
        subprocess.run(["git", "add", "."], cwd=repo_dir, check=True)
        subprocess.run(["git", "commit", "-m", "init"], cwd=repo_dir, check=True)

        manager = WorktreeManager(repo_root=repo_dir)

        # 1. Create worktree
        task_id = "TASK-WT-001"
        wt_path = await manager.create_worktree(task_id, base_branch="develop")
        assert wt_path.exists()
        assert (wt_path / "README.md").exists()

        # Modify inside worktree
        (wt_path / "new_file.txt").write_text("Hello from worktree\n")

        # 2. Cleanup worktree
        await manager.cleanup_worktree(task_id)
        assert not wt_path.exists()
