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

    # Command: init
    init_parser = subparsers.add_parser("init", help="Scan installed harnesses and inject Pinky MCP configuration and rules")
    init_parser.add_argument("--project", type=str, default=None, help="Project directory path")

    # Command: update
    subparsers.add_parser("update", help="Check for and install latest updates from GitHub")

    # Command: uninstall
    uninstall_parser = subparsers.add_parser("uninstall", help="Uninstall Pinky binary and clean MCP configurations")
    uninstall_parser.add_argument("--purge", action="store_true", help="Also remove data in ~/.pinky")

    # Command: version
    subparsers.add_parser("version", help="Show current version")

    args = parser.parse_args()

    if args.command == "version":
        from orchestrator import __version__
        print(f"Pinky Smart Orchestrator v{__version__}")

    elif args.command == "update":
        from orchestrator.updater import check_updates, perform_update
        print("\n[Pinky] Comprobando actualizaciones en GitHub...")
        current, latest, has_update = asyncio.run(check_updates())
        if latest:
            print(f"  Versión actual: v{current}")
            print(f"  Última versión disponible: v{latest}")
            if has_update:
                print(f"\n[Pinky] Nueva versión v{latest} detectada. Actualizando...")
                success = asyncio.run(perform_update())
                if success:
                    print(f"\n[Pinky] Actualizado exitosamente a v{latest}.")
                else:
                    print("\n[Pinky] No se pudo completar la actualización automática.")
            else:
                print("\n[Pinky] Ya disponen de la versión más reciente.")
        else:
            print(f"  Versión actual: v{current}")
            print("  No se pudo contactar con GitHub. Intentando actualizar repositorio local...")
            asyncio.run(perform_update())

    elif args.command == "uninstall":
        from orchestrator.uninstaller import perform_uninstall
        print("\n[Pinky] Desinstalando Pinky Orchestrator...")
        cleaned = perform_uninstall(remove_data=args.purge)
        for c in cleaned:
            print(f"  • {c}")
        print("\n[Pinky] Desinstalación completada.")

    elif args.command == "init":
        from orchestrator.installer import scan_and_configure_all
        from pathlib import Path
        proj_dir = Path(args.project) if args.project else Path.cwd()
        print("\n[Pinky] Buscando arneses e IDEs instalados...")
        results = scan_and_configure_all(proj_dir)
        print(f"\n[Pinky] Configuración completada ({len(results)} destinos integrados):")
        for r in results:
            print(f"  + {r}")
        print("\nAVISO: Si tienen su arnés o IDE abierto (Cursor, VS Code, Pi, OpenCode), reinícienlo para que cargue la nueva configuración del MCP.\n")

    elif args.command == "mcp":
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
