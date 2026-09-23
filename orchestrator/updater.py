"""Updater module for Pinky Smart Orchestrator."""

import asyncio
import json
import shutil
import sys
from pathlib import Path
import httpx
from orchestrator import __version__

GITHUB_REPO = "AdelysAlberto/pinky-smart-orchestrator"
GITHUB_API_LATEST = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"


async def get_latest_remote_version() -> str | None:
    """Query GitHub API for the latest release tag."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(GITHUB_API_LATEST, headers={"User-Agent": "pinky-cli"})
            if resp.status_code == 200:
                tag = resp.json().get("tag_name", "")
                return tag.lstrip("v")
    except Exception:
        pass
    return None


async def check_updates() -> tuple[str, str | None, bool]:
    """Check if a newer version is available on GitHub."""
    current = __version__
    latest = await get_latest_remote_version()
    if not latest:
        return (current, None, False)

    # Basic semver comparison
    try:
        cur_parts = [int(x) for x in current.split(".")]
        lat_parts = [int(x) for x in latest.split(".")]
        has_update = lat_parts > cur_parts
        return (current, latest, has_update)
    except Exception:
        return (current, latest, latest != current)


async def perform_update() -> bool:
    """Update Pinky installation in ~/.pinky/ or local repo."""
    home = Path.home()
    src_dir = home / ".pinky" / "src"
    venv_dir = home / ".pinky" / "env"
    pip_bin = venv_dir / "bin" / "pip"

    # If running from a git clone directly
    project_root = Path(__file__).resolve().parent.parent
    target_repo = project_root if (project_root / ".git").exists() else src_dir

    if not (target_repo / ".git").exists():
        print("  Error: No se encontró repositorio git para actualizar.")
        return False

    print(f"  Descargando últimas actualizaciones desde GitHub ({GITHUB_REPO})...")
    proc = await asyncio.create_subprocess_exec(
        "git", "fetch", "--tags", "--quiet",
        cwd=str(target_repo),
    )
    await proc.communicate()

    proc = await asyncio.create_subprocess_exec(
        "git", "pull", "--quiet", "origin", "main",
        cwd=str(target_repo),
    )
    await proc.communicate()

    # Reinstall package in venv
    if pip_bin.exists():
        print("  Reinstalando dependencias en el entorno virtual...")
        proc = await asyncio.create_subprocess_exec(
            str(pip_bin), "install", "-e", str(target_repo), "--quiet",
        )
        await proc.communicate()

    # Run pinky init to refresh MCP configurations
    from orchestrator.installer import scan_and_configure_all
    scan_and_configure_all()

    return True
