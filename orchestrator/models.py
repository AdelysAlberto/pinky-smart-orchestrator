"""Pydantic models and schemas for Pinky Smart Orchestrator."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    QUEUED = "QUEUED"
    ROUTING = "ROUTING"
    RUNNING = "RUNNING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ScopeType(str, Enum):
    SINGLE = "single"
    PLAN_AND_BUILD = "plan_and_build"


class DomainType(str, Enum):
    CODE = "code"
    ARCHITECTURE = "architecture"
    UX = "ux"
    REVIEW = "review"
    SECURITY = "security"
    LEGAL = "legal"
    FINANCE = "finance"
    GENERAL = "general"


class EffortType(str, Enum):
    LOW = "low"
    HIGH = "high"


class LayaClassification(BaseModel):
    scope: ScopeType = ScopeType.PLAN_AND_BUILD
    domain: DomainType = DomainType.CODE
    effort: EffortType = EffortType.HIGH
    latency_ms: float = 0.0
    fallback: bool = False


class AgentStep(BaseModel):
    agent_name: str
    role_description: str
    harness: str = "pi"
    model: Optional[str] = None
    thinking: Optional[str] = None
    status: TaskStatus = TaskStatus.QUEUED
    plan_file: Optional[str] = None
    exit_code: Optional[int] = None
    error: Optional[str] = None


class Task(BaseModel):
    id: str
    prompt: str
    status: TaskStatus = TaskStatus.QUEUED
    scope: ScopeType = ScopeType.PLAN_AND_BUILD
    domain: DomainType = DomainType.CODE
    effort: EffortType = EffortType.HIGH
    harness: str = "pi"
    worktree_path: Optional[str] = None
    branch_name: Optional[str] = None
    steps: list[AgentStep] = Field(default_factory=list)
    current_step_index: int = 0
    plan_content: Optional[str] = None
    review_content: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class DecisionPayload(BaseModel):
    action: str = Field(description="'approve' or 'reject'")
    notes: Optional[str] = None


class WebSocketEvent(BaseModel):
    event: str
    task_id: Optional[str] = None
    agent: Optional[str] = None
    data: Any = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
