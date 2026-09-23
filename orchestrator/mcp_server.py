"""Model Context Protocol (MCP) Server for Pinky Smart Orchestrator.

Enables Cursor, VS Code, Pi, and OpenCode to orchestrate multi-agent sandboxed
pipelines directly from their native chat interfaces.
"""

import asyncio
import json
from typing import Optional
from mcp.server.mcpserver import MCPServer

from orchestrator.config import config
from orchestrator.models import TaskStatus
from orchestrator.queue_engine import QueueEngine

mcp = MCPServer(
    name="pinky-orchestrator",
    version="1.0.0",
    instructions="Use this tool to orchestrate complex coding, architecture, refactoring, and review tasks using specialized agents (Sheldon, Homero, Edna, Tio Bob) in isolated Git worktree sandboxes.",
)

# Shared queue engine instance for the MCP server process
_engine = QueueEngine()


@mcp.tool(
    name="orchestrate_task",
    description="Enqueue and execute a task through the Pinky multi-agent sandbox pipeline. Automatically routes via Laya-API (Fast-Path for single fixes or Full-Pipeline with Sheldon architecture, approval gate, Homero build, and Tio Bob review).",
)
async def orchestrate_task(prompt: str, harness: Optional[str] = None) -> str:
    """Orchestrate a coding or architecture task using the Pinky pipeline."""
    target_harness = harness or config.default_harness
    task = _engine.enqueue(prompt, target_harness)

    # Launch task execution in background or step through it
    asyncio.create_task(_engine.run_next_task())

    # Wait briefly to catch initial routing or fast-path completion
    for _ in range(10):
        await asyncio.sleep(0.5)
        current = _engine.get_task(task.id)
        if not current:
            break
        if current.status == TaskStatus.AWAITING_APPROVAL:
            return (
                f"### [Pinky Orchestrator] Puerta de Aprobación Requerida\n\n"
                f"**Tarea ID**: `{current.id}` (Harness: `{current.harness}`)\n"
                f"**Arquitecto**: `@sheldon` ha elaborado el plan técnico:\n\n"
                f"---\n{current.plan_content or 'Plan pendiente de lectura'}\n---\n\n"
                f"¿Desean autorizar a `@homero` para implementar este plan? "
                f"Respondan con aprobación o invoquen la herramienta `approve_task(task_id='{current.id}', approved=True)`."
            )
        if current.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
            break

    current = _engine.get_task(task.id)
    if not current:
        return f"Tarea {task.id} encolada exitosamente."

    if current.status == TaskStatus.COMPLETED:
        return (
            f"### [Pinky Orchestrator] Tarea Completada con Éxito\n\n"
            f"**ID**: `{current.id}`\n"
            f"**Alcance**: `{current.scope.value}`\n"
            f"**Harness**: `{current.harness}`\n"
            f"**Resultado**: Cambios verificados mediante pruebas deterministas y fusionados en `{config.default_branch}`.\n"
            f"Sandbox efímero destruido limpiamente."
        )

    if current.status == TaskStatus.FAILED:
        return f"### [Pinky Orchestrator] Error en Tarea {current.id}\n\nFallo: {current.error}"

    return (
        f"### [Pinky Orchestrator] Tarea en Ejecución\n\n"
        f"**ID**: `{current.id}`\n"
        f"**Estado**: `{current.status.value}`\n"
        f"**Harness**: `{current.harness}`\n"
        f"La tarea continúa en segundo plano. Pueden consultar el progreso con `get_task_status(task_id='{current.id}')` o en el Dashboard en http://{config.host}:{config.port}."
    )


@mcp.tool(
    name="approve_task",
    description="Approve or reject a pending technical plan for a task in state AWAITING_APPROVAL.",
)
async def approve_task(task_id: str, approved: bool = True) -> str:
    """Approve or reject a task currently waiting at the approval gate."""
    resolved = _engine.decision_hub.resolve(task_id, approved)
    if not resolved:
        return f"No se encontró ninguna decisión pendiente para la tarea '{task_id}'."

    action_text = "aprobado" if approved else "rechazado"
    return f"El plan de la tarea '{task_id}' ha sido {action_text} exitosamente. El pipeline continúa su ejecución."


@mcp.tool(
    name="get_task_status",
    description="Retrieve the detailed real-time execution status of an orchestrator task.",
)
async def get_task_status(task_id: str) -> str:
    """Check task status, current phase, plan content, and errors."""
    task = _engine.get_task(task_id)
    if not task:
        return f"Tarea '{task_id}' no encontrada en la cola."

    steps_summary = "\n".join(
        [f"- `@ {s.agent_name}`: {s.status.value} (Exit code: {s.exit_code})" for s in task.steps]
    )

    return (
        f"### Estado de Tarea: `{task.id}`\n\n"
        f"- **Estado General**: `{task.status.value}`\n"
        f"- **Alcance (Scope)**: `{task.scope.value}`\n"
        f"- **Dominio**: `{task.domain.value}`\n"
        f"- **Esfuerzo**: `{task.effort.value}`\n"
        f"- **Harness**: `{task.harness}`\n"
        f"- **Pasos del Pipeline**:\n{steps_summary}\n\n"
        f"{'**Plan**:\n' + task.plan_content if task.plan_content else ''}"
    )


@mcp.tool(
    name="list_tasks",
    description="List all active, queued, and completed tasks in Pinky Orchestrator.",
)
async def list_tasks() -> str:
    """List all tasks in the SQLite FIFO queue."""
    tasks = _engine.list_tasks()
    if not tasks:
        return "No hay tareas registradas en la cola de Pinky."

    lines = [f"- **`{t.id}`** | `{t.status.value}` | `{t.harness}` | {t.prompt[:40]}..." for t in tasks]
    return "### Tareas en Pinky Smart Orchestrator:\n\n" + "\n".join(lines)


def main():
    """Run the MCP server over standard I/O (stdio)."""
    mcp.run()


if __name__ == "__main__":
    main()
