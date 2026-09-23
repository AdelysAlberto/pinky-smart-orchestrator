# OpenCode — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

OpenCode's native global customization root is:

```text
~/.config/opencode/
├── opencode.json
├── AGENTS.md
├── agents/
├── skills/
└── ...
```

The directory uses plural capability folders such as `agents/` and `skills/`.

## 2. Global custom agents

OpenCode supports agents in two native forms.

### A. In global JSON config

```text
~/.config/opencode/opencode.json
```

Example:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "reviewer": {
      "description": "Reviews code for quality and security.",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "Review code without editing it.",
      "permission": {
        "edit": "deny"
      }
    }
  }
}
```

### B. As Markdown files

**Global path:**

```text
~/.config/opencode/agents/<agent-name>.md
```

Example:

```yaml
---
description: Reviews code for quality and best practices.
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
permission:
  edit: deny
  bash: deny
---

Review code for correctness, security, performance, and maintainability.
```

The filename becomes the agent name.

## 3. Global rules / instructions

The native global instruction file is:

```text
~/.config/opencode/AGENTS.md
```

OpenCode loads this across all OpenCode sessions.

OpenCode also supports custom instruction files through the `instructions` field in the global config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    ".cursor/rules/*.md"
  ]
}
```

Claude Code compatibility is available as a fallback, including:

```text
~/.claude/CLAUDE.md
```

## 4. Global skills

**Native global path:**

```text
~/.config/opencode/skills/<skill-name>/SKILL.md
```

OpenCode also reads compatible skills from:

```text
~/.claude/skills/<skill-name>/SKILL.md
~/.agents/skills/<skill-name>/SKILL.md
```

The `SKILL.md` uses YAML frontmatter; the documented required fields are `name` and `description`.

## 5. Configuration hierarchy

Current OpenCode config precedence places standard global configuration at:

```text
~/.config/opencode/opencode.json
```

Project `opencode.json` has higher standard-file precedence than the global file.

A custom config directory can be provided with:

```text
OPENCODE_CONFIG_DIR
```

That directory follows the same structural convention for agents, commands, plugins, modes, skills, etc.

## 6. Global map

| Need | Native global surface |
|---|---|
| Specialist agent | `~/.config/opencode/agents/*.md` or `agent` object in `opencode.json` |
| Persistent rules | `~/.config/opencode/AGENTS.md` |
| Extra instruction files | `instructions` in `opencode.json` |
| On-demand skill | `~/.config/opencode/skills/<name>/SKILL.md` |
| Main runtime config | `~/.config/opencode/opencode.json` |

## 7. Sources

- OpenCode — Agents: https://opencode.ai/docs/agents
- OpenCode — Skills: https://opencode.ai/docs/skills
- OpenCode — Rules: https://dev.opencode.ai/docs/rules/
- OpenCode — Config: https://dev.opencode.ai/docs/config/
