"""Tests for Queue Engine SQLite persistence."""

import tempfile
from pathlib import Path
from orchestrator.models import TaskStatus
from orchestrator.queue_engine import QueueEngine


def test_enqueue_and_retrieve():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_queue.db"
        engine = QueueEngine(db_path=db_path)

        task = engine.enqueue("Refactor auth module", harness="opencode")
        assert task.id.startswith("TASK-")
        assert task.status == TaskStatus.QUEUED
        assert task.harness == "opencode"

        retrieved = engine.get_task(task.id)
        assert retrieved is not None
        assert retrieved.id == task.id
        assert retrieved.prompt == "Refactor auth module"
        assert retrieved.harness == "opencode"

        tasks = engine.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].id == task.id
