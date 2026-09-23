# Google Antigravity — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global customization root

For Antigravity 2.0 / IDE-style customizations, the global customization tree is under:

```text
~/.gemini/config/
├── agents/
└── skills/
```

Global rules are intentionally separate:

```text
~/.gemini/GEMINI.md
```

The current Antigravity documentation distinguishes Antigravity 2.0, the CLI, and the standalone IDE. Paths below call out that surface distinction instead of collapsing them into one path.

## 2. Global custom agents

A custom agent is a directory containing `agent.md`.

**Global Antigravity 2.0 / IDE path:**

```text
~/.gemini/config/agents/<agent-name>/agent.md
```

Minimal documented structure:

```yaml
---
name: code-reviewer
description: Rigorous code review specialist focusing on edge cases and security.
---

You are an expert code reviewer. Analyze diffs carefully and verify edge cases.
```

The `/agents` panel exposes the exact creation paths and uses the filename/folder structure shown above.

**Workspace:**

```text
<workspace-root>/.agents/agents/<agent-name>/agent.md
```

## 3. Global rules

**Global rules for Antigravity 2.0 / IDE:**

```text
~/.gemini/GEMINI.md
```

These rules are Markdown and are applied across all workspaces.

**Workspace rules:**

```text
<workspace-root>/.agents/rules/
```

Rule activation can be:

- Manual (`@mention`)
- Always On
- Model Decision
- Glob pattern

Current Antigravity documentation says `.agents/rules` is the default and `.agent/rules` remains backward-compatible.

**CLI-specific global rules:**

```text
~/.gemini/antigravity-cli/rules/
```

The CLI can also use the persistent `~/.gemini/GEMINI.md` file.

## 4. Global skills

Skills follow the Agent Skills structure: one directory with a `SKILL.md`.

**Antigravity 2.0 / standalone IDE:**

```text
~/.gemini/config/skills/<skill-name>/SKILL.md
```

**CLI:**

```text
~/.gemini/antigravity-cli/skills/<skill-name>/SKILL.md
```

Workspace skills use:

```text
<workspace-root>/.agents/skills/<skill-name>/SKILL.md
```

Legacy compatibility is documented for older `.agent/skills` locations.

## 5. Surface distinction — important

Do not write a migration script that assumes every Antigravity surface reads the same global directory.

| Surface | Global agents | Global rules | Global skills |
|---|---|---|---|
| Antigravity 2.0 | `~/.gemini/config/agents/` | `~/.gemini/GEMINI.md` | `~/.gemini/config/skills/` |
| Standalone IDE | `~/.gemini/config/agents/` | `~/.gemini/GEMINI.md` | `~/.gemini/config/skills/` |
| Antigravity CLI | documented agent surface is CLI-specific; do not assume IDE path without checking current CLI docs | `~/.gemini/antigravity-cli/rules/` and `~/.gemini/GEMINI.md` | `~/.gemini/antigravity-cli/skills/` |

The official CLI/2.0 docs explicitly document separate skill and rule paths. This is one of the places where a “single global folder” abstraction would create a false positive.

## 6. Sources

- Antigravity — Agents command: https://antigravity.google/docs/cli/commands/agents/
- Antigravity — Rules: https://antigravity.google/docs/ide/rules/
- Antigravity — Rules / surfaces: https://antigravity.google/docs/rules-workflows
- Antigravity — Agent Skills: https://www.antigravity.google/docs/skills?tab=ide
