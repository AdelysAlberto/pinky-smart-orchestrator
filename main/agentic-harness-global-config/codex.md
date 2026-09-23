# OpenAI Codex — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

Codex uses:

```text
~/.codex/
```

for user-level configuration and global guidance.

A documented global settings file is:

```text
~/.codex/config.toml
```

## 2. Global persistent instructions / rules

Codex uses `AGENTS.md` as its durable instruction mechanism.

**Global user path:**

```text
~/.codex/AGENTS.md
```

An override file is also supported:

```text
~/.codex/AGENTS.override.md
```

The override takes precedence over the normal global `AGENTS.md`.

Codex then collects project instructions from the repository root down to the current working directory, using `AGENTS.override.md` / `AGENTS.md` and configured fallback names.

This means the Codex model is not built around a separate global `rules/` directory. `AGENTS.md` is the primary durable rule/instruction surface.

## 3. Global skills

Codex uses the Agent Skills structure.

**Global user path:**

```text
~/.codex/skills/<skill-name>/SKILL.md
```

A skill is a directory with `SKILL.md` containing YAML frontmatter such as:

```yaml
---
name: setup-demo-app
description: Scaffold a small Vite + React + Tailwind demo app.
---

## When to use this

Use when...
```

OpenAI documentation explicitly shows `~/.codex/skills/...` as user scope.

## 4. Global configuration

```text
~/.codex/config.toml
```

This is the user-level Codex configuration file.

Current documentation also uses `model_instructions_file` for model/system-style instructions loaded through configuration. The older `experimental_instructions_file` name is documented as deprecated.

## 5. Custom agent / subagent declaration

Codex's current public materials clearly document **agentic subagent execution as part of the Codex harness**, but the canonical sources retrieved for this verification pass did not expose a sufficiently explicit, current, user-level file path + complete declaration schema for persisted custom subagents comparable to:

```text
~/.claude/agents/*.md
~/.cursor/agents/*.md
~/.omp/agent/agents/*.md
```

Therefore this document deliberately records:

```text
Persisted global custom-agent file format: NOT VERIFIED
```

Do **not** invent or standardize a `.codex/agents/` path from third-party examples without checking the current Codex subagents documentation for the exact version you are deploying.

This is the one major intentional gap in this research set: a missing verified path is safer than a false positive.

## 6. Global map

| Need | Codex global surface |
|---|---|
| Persistent global instructions | `~/.codex/AGENTS.md` |
| Global override | `~/.codex/AGENTS.override.md` |
| Global skill | `~/.codex/skills/<name>/SKILL.md` |
| Main config | `~/.codex/config.toml` |
| Persisted custom named agent | **Not verified in canonical sources inspected** |

## 7. Sources

- OpenAI Developers — Agents.md behavior: https://developers.openai.com/es-419/blog/rethinking-skills-and-prompts-for-gpt-6-astra
- OpenAI Developers — skills evaluation / user-scope example: https://developers.openai.com/es-419/blog/eval-skills
- OpenAI Developers — config reference: https://developers.openai.com/ja-JP/docs/config-file/config-reference
- OpenAI — Codex agent loop / harness: https://openai.com/index/unrolling-the-codex-agent-loop/
- OpenAI Codex source — AGENTS.md discovery: https://github.com/openai/codex/blob/main/codex-rs/core/src/agents_md.rs
