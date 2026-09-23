"""Configuration settings for the Pinky Smart Orchestrator."""

import os
from pathlib import Path
from pydantic import BaseModel, Field


def _resolve_dir(local_name: str, fallback_path: str) -> Path:
    # 1. Check relative to pi-py root
    project_root = Path(__file__).resolve().parent.parent
    local_dir = project_root / local_name
    if local_dir.exists():
        return local_dir

    # 2. Check fallback path
    fallback = Path(fallback_path)
    if fallback.exists():
        return fallback

    return local_dir


class OrchestratorConfig(BaseModel):
    agents_dir: Path = Field(
        default_factory=lambda: _resolve_dir("agents", "/Volumes/Datos/Projects/utils/agents/agents-smart/agents"),
        description="Directory containing agent specifications (.md)",
    )
    rules_dir: Path = Field(
        default_factory=lambda: _resolve_dir("rules", "/Volumes/Datos/Projects/utils/agents/agents-smart/rules"),
        description="Directory containing system rules (.md)",
    )
    skills_dir: Path = Field(
        default_factory=lambda: _resolve_dir("skills", "/Volumes/Datos/Projects/utils/agents/agents-smart/skills"),
        description="Directory containing skills",
    )
    laya_endpoint: str = Field(
        default=os.getenv("LAYA_ENDPOINT", "http://127.0.0.1:8090/analyze"),
        description="Local Laya-API classification endpoint",
    )
    laya_timeout_ms: int = Field(
        default=500, description="Timeout for Laya-API classification in ms"
    )
    default_harness: str = Field(
        default=os.getenv("DEFAULT_HARNESS", "pi"),
        description="Default CLI agent harness (pi, opencode, claude, custom)",
    )
    host: str = Field(default="127.0.0.1", description="FastAPI server host")
    port: int = Field(default=8765, description="FastAPI server port")
    worktrees_root: Path = Field(
        default=Path(".pinky/worktrees"),
        description="Directory where ephemeral Git worktrees are created",
    )
    db_path: Path = Field(
        default=Path(".pinky/orchestrator.db"),
        description="SQLite database path for queue persistence",
    )
    default_branch: str = Field(
        default="develop", description="Default branch to branch off and merge back"
    )
    max_turns: int = Field(
        default=10, description="Maximum agent turns per task to prevent token waste"
    )
    keep_on_fail: bool = Field(
        default=False, description="Whether to retain worktree when task fails"
    )

    effort_models: dict[str, dict[str, str]] = Field(
        default={
            "low": {
                "model": "deepseek-ryg/deepseek-flash",
                "thinking": "low",
            },
            "high": {
                "model": "deepseek-ryg/deepseek-v4-pro",
                "thinking": "high",
            },
        }
    )


# Global singleton instance
config = OrchestratorConfig()
