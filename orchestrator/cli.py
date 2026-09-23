"""CLI entrypoint for Pinky Smart Orchestrator."""

import argparse
import asyncio
import sys
import uvicorn
from orchestrator.config import config
from orchestrator.queue_engine import QueueEngine


def main():
    parser = argparse.ArgumentParser(description="Pinky Smart Orchestrator CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: run
    run_parser = subparsers.add_parser("run", help="Enqueue and execute a task immediately")
    run_parser.add_argument("prompt", type=str, help="Task description or objective")
    run_parser.add_argument("--harness", type=str, default=config.default_harness, help="Harness to use (pi, opencode, claude)")

    # Command: start
    start_parser = subparsers.add_parser("start", help="Start the Orchestrator service and Web Dashboard")
    start_parser.add_argument("--host", type=str, default=config.host, help="Bind host")
    start_parser.add_argument("--port", type=int, default=config.port, help="Bind port")

    # Command: list
    subparsers.add_parser("list", help="List all tasks in queue")

    # Command: mcp
    subparsers.add_parser("mcp", help="Run the MCP Server over stdio for Cursor, VS Code, and Pi")

    args = parser.parse_args()

    if args.command == "mcp":
        from orchestrator.mcp_server import main as run_mcp
        run_mcp()

    elif args.command == "start":
        print(f"\n[Pinky] Starting Orchestrator Server at http://{args.host}:{args.port}")
        uvicorn.run("orchestrator.server:app", host=args.host, port=args.port, reload=False)

    elif args.command == "run":
        engine = QueueEngine()
        task = engine.enqueue(args.prompt, args.harness)
        print(f"\n[Pinky] Tarea encolada con ID: {task.id} (Harness: {task.harness})")
        print(f"[Pinky] Ejecutando pipeline en segundo plano...")
        asyncio.run(engine.run_next_task())
        updated = engine.get_task(task.id)
        if updated:
            print(f"\n[Pinky] Tarea {task.id} finalizada con estado: {updated.status.value}")

    elif args.command == "list":
        engine = QueueEngine()
        tasks = engine.list_tasks()
        if not tasks:
            print("\nNo hay tareas registradas en la cola.")
            return
        print(f"\n{'ID':<15} {'ESTADO':<20} {'SCOPE':<15} {'HARNESS':<10} {'PROMPT'}")
        print("-" * 75)
        for t in tasks:
            print(f"{t.id:<15} {t.status.value:<20} {t.scope.value:<15} {t.harness:<10} {t.prompt[:30]}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
