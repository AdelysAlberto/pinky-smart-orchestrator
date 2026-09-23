"""Persistent SQLite FIFO Queue Engine and Pipeline Coordinator."""

import asyncio
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Coroutine, Optional

from orchestrator.agent_runner import AgentRunner
from orchestrator.cogni_bridge import CogniBridge
from orchestrator.config import config
from orchestrator.decision_hub import DecisionHub
from orchestrator.harnesses.factory import get_harness_adapter
from orchestrator.models import (
    AgentStep,
    DomainType,
    EffortType,
    ScopeType,
    Task,
    TaskStatus,
)
from orchestrator.router_bridge import classify_prompt
from orchestrator.worktree_manager import WorktreeManager


class QueueEngine:
    """Coordinates the FIFO queue, stage progression, and worktree lifecycles."""

    def __init__(
        self,
        db_path: Path | None = None,
        on_event: Optional[Callable[[str, dict], Coroutine]] = None,
    ):
        self.db_path = db_path or config.db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.on_event = on_event
        self.worktree_mgr = WorktreeManager()
        self.agent_runner = AgentRunner()
        self.cogni_bridge = CogniBridge()
        self.decision_hub = DecisionHub()
        self._is_paused = False
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    prompt TEXT NOT NULL,
                    status TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    effort TEXT NOT NULL,
                    harness TEXT NOT NULL,
                    worktree_path TEXT,
                    branch_name TEXT,
                    steps_json TEXT NOT NULL,
                    current_step_index INTEGER DEFAULT 0,
                    plan_content TEXT,
                    review_content TEXT,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    error TEXT
                )
                """
            )
            conn.commit()

    async def _emit(self, event_type: str, data: dict):
        if self.on_event:
            try:
                await self.on_event(event_type, data)
            except Exception:
                pass

    def enqueue(self, prompt: str, harness: str | None = None) -> Task:
        """Enqueue a new task into the FIFO persistent storage."""
        task_id = f"TASK-{uuid.uuid4().hex[:8].upper()}"
        task = Task(
            id=task_id,
            prompt=prompt,
            status=TaskStatus.QUEUED,
            harness=harness or config.default_harness,
            created_at=datetime.now(timezone.utc),
        )
        self._save_task(task)
        return task

    def _save_task(self, task: Task):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO tasks (
                    id, prompt, status, scope, domain, effort, harness,
                    worktree_path, branch_name, steps_json, current_step_index,
                    plan_content, review_content, created_at, completed_at, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.id,
                    task.prompt,
                    task.status.value,
                    task.scope.value,
                    task.domain.value,
                    task.effort.value,
                    task.harness,
                    task.worktree_path,
                    task.branch_name,
                    json.dumps([s.model_dump() for s in task.steps]),
                    task.current_step_index,
                    task.plan_content,
                    task.review_content,
                    task.created_at.isoformat(),
                    task.completed_at.isoformat() if task.completed_at else None,
                    task.error,
                ),
            )
            conn.commit()

    def get_task(self, task_id: str) -> Optional[Task]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_task(row)

    def list_tasks(self) -> list[Task]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM tasks ORDER BY created_at ASC")
            return [self._row_to_task(r) for r in cursor.fetchall()]

    def _row_to_task(self, row: tuple) -> Task:
        steps_data = json.loads(row[9])
        steps = [AgentStep(**s) for s in steps_data]
        return Task(
            id=row[0],
            prompt=row[1],
            status=TaskStatus(row[2]),
            scope=ScopeType(row[3]),
            domain=DomainType(row[4]),
            effort=EffortType(row[5]),
            harness=row[6],
            worktree_path=row[7],
            branch_name=row[8],
            steps=steps,
            current_step_index=row[10],
            plan_content=row[11],
            review_content=row[12],
            created_at=datetime.fromisoformat(row[13]),
            completed_at=datetime.fromisoformat(row[14]) if row[14] else None,
            error=row[15],
        )

    def pause_queue(self):
        self._is_paused = True

    def resume_queue(self):
        self._is_paused = False

    async def run_next_task(self) -> Optional[Task]:
        """Fetch the next QUEUED task and execute it through its pipeline."""
        if self._is_paused:
            return None

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT id FROM tasks WHERE status = ? ORDER BY created_at ASC LIMIT 1",
                (TaskStatus.QUEUED.value,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            task_id = row[0]

        task = self.get_task(task_id)
        if not task:
            return None

        # 1. Routing phase with Laya-API
        task.status = TaskStatus.ROUTING
        self._save_task(task)
        await self._emit("task_routing", {"task_id": task.id})

        laya_res = await classify_prompt(task.prompt)
        task.scope = laya_res.scope
        task.domain = laya_res.domain
        task.effort = laya_res.effort

        # Configure models by effort
        effort_cfg = config.effort_models.get(task.effort.value, config.effort_models["high"])
        model_name = effort_cfg["model"]
        thinking_level = effort_cfg["thinking"]

        # Build pipeline steps based on scope
        if task.scope == ScopeType.SINGLE:
            target_agent = "homero"
            if task.domain == DomainType.UX:
                target_agent = "edna"
            elif task.domain == DomainType.REVIEW:
                target_agent = "tio-bob"

            task.steps = [
                AgentStep(
                    agent_name=target_agent,
                    role_description=f"Direct specialist execution ({target_agent})",
                    harness=task.harness,
                    model=model_name,
                    thinking=thinking_level,
                )
            ]
        else:
            task.steps = [
                AgentStep(
                    agent_name="sheldon",
                    role_description="Architecture & Blueprint Spec",
                    harness=task.harness,
                    model=model_name,
                    thinking=thinking_level,
                    plan_file=f"plan/{task.id}.md",
                ),
                AgentStep(
                    agent_name="homero",
                    role_description="Implementation & Deterministic Testing",
                    harness=task.harness,
                    model=model_name,
                    thinking=thinking_level,
                ),
                AgentStep(
                    agent_name="tio-bob",
                    role_description="Code Review & Standards Audit",
                    harness=task.harness,
                    model=model_name,
                    thinking="low",
                ),
            ]

        # 2. Create isolated Git Worktree
        worktree_path = await self.worktree_mgr.create_worktree(task.id)
        task.worktree_path = str(worktree_path)
        task.branch_name = f"pinky/{task.id}"
        task.status = TaskStatus.RUNNING
        self._save_task(task)
        await self._emit("task_started", {"task": task.model_dump()})

        # 3. Ingest Cogni context
        await self.cogni_bridge.ingest_context(task.prompt, worktree_path)

        adapter = get_harness_adapter(task.harness)

        try:
            for idx, step in enumerate(task.steps):
                task.current_step_index = idx
                step.status = TaskStatus.RUNNING
                self._save_task(task)
                await self._emit("step_started", {"task_id": task.id, "step": step.model_dump()})

                # Determine prompt for this step
                if step.agent_name == "sheldon":
                    step_prompt = (
                        f"Analyze the codebase and write an actionable technical plan to: {task.prompt}.\n"
                        f"Write your plan to {step.plan_file}."
                    )
                elif step.agent_name == "homero":
                    plan_file = worktree_path / f"plan/{task.id}.md"
                    plan_ref = f"@{plan_file.name}" if plan_file.exists() else ""
                    step_prompt = (
                        f"Implement the plan {plan_ref} for task: {task.prompt}.\n"
                        f"Run deterministic tests (bun test or pytest) and ensure clean build."
                    )
                else:  # tio-bob
                    step_prompt = (
                        f"Review the git diff against develop for task: {task.prompt}.\n"
                        f"Output audit report to artifacts/{task.id}_REVIEW.md."
                    )

                async def _log_chunk_handler(chunk: str):
                    await self._emit("log_chunk", {
                        "task_id": task.id,
                        "agent": step.agent_name,
                        "chunk": chunk,
                    })

                # Run agent in PTY
                code = await self.agent_runner.run(
                    harness=adapter,
                    agent=step.agent_name,
                    prompt=step_prompt,
                    worktree_path=worktree_path,
                    model=step.model,
                    thinking=step.thinking,
                    max_turns=config.max_turns,
                    on_chunk=_log_chunk_handler,
                )
                step.exit_code = code

                if code != 0:
                    step.status = TaskStatus.FAILED
                    task.status = TaskStatus.FAILED
                    task.error = f"Agent {step.agent_name} exited with code {code}"
                    self._save_task(task)
                    await self._emit("task_failed", {"task_id": task.id, "error": task.error})
                    return task

                step.status = TaskStatus.COMPLETED

                # Check if this was Sheldon and we need human approval before Homero
                if step.agent_name == "sheldon" and len(task.steps) > 1:
                    plan_path = worktree_path / f"plan/{task.id}.md"
                    if plan_path.exists():
                        task.plan_content = plan_path.read_text(encoding="utf-8")
                    task.status = TaskStatus.AWAITING_APPROVAL
                    self._save_task(task)
                    await self._emit("awaiting_approval", {
                        "task_id": task.id,
                        "plan": task.plan_content,
                    })

                    approved = await self.decision_hub.wait_for_decision(
                        task_id=task.id,
                        plan_path=str(plan_path),
                        enable_cli_prompt=True,
                    )
                    if not approved:
                        task.status = TaskStatus.CANCELLED
                        task.error = "Rejected at approval gate"
                        self._save_task(task)
                        await self.worktree_mgr.cleanup_worktree(task.id)
                        await self._emit("task_cancelled", {"task_id": task.id})
                        return task

                    task.status = TaskStatus.RUNNING

            # All steps passed: merge and persist
            await self.cogni_bridge.persist_signature(
                task_id=task.id,
                summary=f"Task completed successfully: {task.prompt[:200]}",
            )
            await self.worktree_mgr.merge_and_remove(task.id)
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now(timezone.utc)
            self._save_task(task)
            await self._emit("task_completed", {"task_id": task.id})
            return task

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            self._save_task(task)
            if not config.keep_on_fail:
                await self.worktree_mgr.cleanup_worktree(task.id)
            await self._emit("task_failed", {"task_id": task.id, "error": str(e)})
            return task
