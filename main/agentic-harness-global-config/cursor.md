# Cursor — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

Cursor's local user-level customization tree relevant to Agent includes:

```text
~/.cursor/
├── agents/
├── rules/
├── skills/
└── ...
```

Cursor also syncs account-level User Rules through its service, so the global rule layer is not exclusively filesystem-backed.

## 2. Global custom subagents

**Global path:**

```text
~/.cursor/agents/<agent-name>.md
```

The file is Markdown with YAML frontmatter.

Minimal shape:

```yaml
---
name: verifier
description: Validates completed work and reports what actually passed.
---

Verify the implementation with tests and inspect edge cases.
```

Project subagents live in:

```text
.cursor/agents/
```

Cursor also reads compatibility subagents from `~/.claude/agents/` and `~/.codex/agents/`.

## 3. Global rules

Cursor has multiple rule surfaces.

### User Rules

The primary account-level global rule surface is:

```text
Cursor Settings / Customize → Rules
```

Current product documentation says these rules are global, apply across all projects, and sync with the user's Cursor account.

### File-backed user rules

Current Cursor help documentation also documents local file-backed user rules at:

```text
~/.cursor/rules/
```

These local files stay on the machine and do not sync with the account.

### Project rules

The repository-native rule path is:

```text
.cursor/rules/*.mdc
```

Project rule files use MDC frontmatter such as:

```yaml
---
description: Frontend architecture rules
globs:
  - "src/**/*.tsx"
alwaysApply: false
---

Use the repository's component and accessibility conventions.
```

## 4. Global skills

Cursor supports Agent Skills as an open standard.

**Native global path:**

```text
~/.cursor/skills/<skill-name>/SKILL.md
```

Cursor also discovers compatible user skills from:

```text
~/.agents/skills/
~/.claude/skills/
~/.codex/skills/
```

A skill is a directory containing `SKILL.md` with required `name` and `description` frontmatter.

## 5. Main global configuration

Cursor does not expose one monolithic Markdown file that defines the entire agentic system.

The effective global stack is:

```text
~/.cursor/agents/     # persistent custom subagents
~/.cursor/rules/      # local file-backed user rules
~/.cursor/skills/     # global skills
Cursor Settings       # account-synced User Rules and agent preferences
~/.cursor/...         # other local configuration/data
```

For example, Cursor's documented MCP global configuration is:

```text
~/.cursor/mcp.json
```

but MCP is separate from the requested agent/rule/skill layer.

## 6. Important rule-storage caveat

Cursor's documentation currently describes **both** account-synced User Rules and local file-backed user rules.

Do not conflate them:

| Layer | Storage | Sync |
|---|---|---|
| User Rules | Cursor account / Settings | Yes |
| File-backed user rules | `~/.cursor/rules/` | No |
| Project rules | `.cursor/rules/` | Through Git/project repository |

This distinction matters when building a dotfiles-based “global agent configuration” system.

## 7. Global map

| Need | Cursor global surface |
|---|---|
| Specialist subagent | `~/.cursor/agents/*.md` |
| Global user rule | Cursor Settings → Rules / `~/.cursor/rules/` for local file-backed rules |
| Global skill | `~/.cursor/skills/<name>/SKILL.md` |
| Other global agent config | Cursor Settings + `~/.cursor/` data/config |

## 8. Sources

- Cursor — Subagents: https://prod.cursor.com/docs/subagents
- Cursor — Agent Skills: https://prod.cursor.com/docs/skills
- Cursor — Rules: https://prod.cursor.com/docs/rules
- Cursor — Current help for rule storage: https://prod.cursor.com/help/customization/rules
