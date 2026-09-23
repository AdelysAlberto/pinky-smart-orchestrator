# Claude Code — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

Claude Code's global customization root is:

```text
~/.claude/
```

The current documentation describes this tree as the user-level location for instructions, settings, hooks, skills, commands, subagents, rules, and other state.

## 2. Global custom subagents

**Global path:**

```text
~/.claude/agents/<agent-name>.md
```

The file defines a specialized subagent with its own prompt and tool configuration.

A representative structure is:

```yaml
---
name: code-reviewer
description: Review code for correctness and security.
tools: Read, Grep, Glob, Bash
---

Review the requested change. Do not make edits.
```

The exact frontmatter fields depend on the current Claude Code subagent specification; use the official subagent documentation for the full set rather than treating the example as a complete schema.

Project equivalents live under:

```text
.claude/agents/
```

## 3. Global instructions

The durable global instruction file is:

```text
~/.claude/CLAUDE.md
```

Claude loads it as persistent context for sessions across projects.

Use this for broad durable guidance such as:

- coding conventions;
- preferred commands;
- architecture conventions;
- “always / never” constraints.

## 4. Global rules

Claude Code also supports path-scoped or subject-focused rules in:

```text
~/.claude/rules/*.md
```

These are distinct from `CLAUDE.md` and can be used to keep the main instruction file smaller and load guidance by path/concern.

## 5. Global skills

**Global path:**

```text
~/.claude/skills/<skill-name>/SKILL.md
```

Skills are reusable instructions/workflows. A skill can be manually invoked (for example `/deploy`) or loaded automatically when relevant.

The `SKILL.md` format supports YAML frontmatter and a Markdown body. Skills can also carry supporting files and scripts in the same directory.

## 6. Global configuration

The main user-level settings file is:

```text
~/.claude/settings.json
```

The official directory documentation also identifies `~/.claude.json` as global application state/credentials and MCP-related state.

For the agentic customization model requested here, the important split is:

```text
~/.claude/CLAUDE.md       # persistent global context
~/.claude/rules/          # global rule modules
~/.claude/skills/         # global skills
~/.claude/agents/         # global subagents
~/.claude/settings.json   # global settings / permissions / hooks / env / model defaults
```

## 7. Native model

Claude Code is explicit about layering:

- `CLAUDE.md` = persistent context;
- `rules/` = focused or path-scoped instructions;
- `skills/` = on-demand reusable capabilities;
- `agents/` = isolated specialist workers;
- `settings.json` = runtime/settings layer.

That means a single giant global file is not the only, or necessarily intended, customization mechanism.

## 8. Sources

- Claude Code — `.claude` directory reference: https://code.claude.com/docs/fr/claude-directory
- Claude Code — customization/extension model: https://code.claude.com/docs/id/features-overview
