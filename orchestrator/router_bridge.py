"""Client bridge for Laya-API local classification (System 1)."""

import time
import httpx
from orchestrator.config import config
from orchestrator.models import (
    DomainType,
    EffortType,
    LayaClassification,
    ScopeType,
)


async def classify_prompt(prompt: str) -> LayaClassification:
    """Send prompt to local Laya-API for ~30ms non-autoregressive routing."""
    start_t = time.perf_counter()

    payload = {
        "state": {
            "prompt": prompt,
        },
        "questions": {
            "scope": {
                "type": "choice",
                "instructions": "Does this task need a design plan before build, or is it a single direct step?",
                "criteria": {
                    "single": "a bounded change, localized bugfix, styling, diff review, direct question, or simple fix that one specialist can resolve directly",
                    "plan_and_build": "a new feature, a cross-module change, complex logic or an unfamiliar area requiring an architectural plan and approval",
                },
            },
            "domain": {
                "type": "choice",
                "instructions": "Which domain owns this task?",
                "criteria": {
                    "code": "writing, modifying code, backend, algorithms, fixing bugs, implementing features",
                    "architecture": "system architecture, cross-module boundaries, DDL schema, technical planning",
                    "ux": "visual design, CSS colors, typography, design tokens, visual aesthetics, UI layout",
                    "review": "code review, reviewing pull requests, inspecting git diffs, checking staged changes",
                    "security": "security audit, OWASP vulnerabilities, secret leaks, endpoint hardening",
                },
            },
            "effort": {
                "type": "choice",
                "instructions": "How much reasoning effort does this task demand?",
                "criteria": {
                    "low": "straightforward task, small change, minimal files, low risk",
                    "high": "complex architecture, high risk, multi-file refactoring or tricky edge cases",
                },
            },
        },
    }

    timeout_secs = config.laya_timeout_ms / 1000.0
    try:
        async with httpx.AsyncClient(timeout=timeout_secs) as client:
            resp = await client.post(config.laya_endpoint, json=payload)
            if resp.status_code == 200:
                elapsed_ms = (time.perf_counter() - start_t) * 1000.0
                data = resp.json().get("answers", {})

                scope_val = data.get("scope", {}).get("choice", "plan_and_build")
                domain_val = data.get("domain", {}).get("choice", "code")
                effort_val = data.get("effort", {}).get("choice", "high")

                return LayaClassification(
                    scope=ScopeType(scope_val) if scope_val in ScopeType._value2member_map_ else ScopeType.PLAN_AND_BUILD,
                    domain=DomainType(domain_val) if domain_val in DomainType._value2member_map_ else DomainType.CODE,
                    effort=EffortType(effort_val) if effort_val in EffortType._value2member_map_ else EffortType.HIGH,
                    latency_ms=round(elapsed_ms, 2),
                    fallback=False,
                )
    except Exception:
        # Fallback if Laya-API is not running or timed out
        pass

    elapsed_ms = (time.perf_counter() - start_t) * 1000.0
    return LayaClassification(
        scope=ScopeType.PLAN_AND_BUILD,
        domain=DomainType.CODE,
        effort=EffortType.HIGH,
        latency_ms=round(elapsed_ms, 2),
        fallback=True,
    )
