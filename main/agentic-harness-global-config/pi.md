# Pi — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

Pi's user-level agent directory defaults to:

```text
~/.pi/agent/
```

It can be relocated with:

```text
PI_CODING_AGENT_DIR=/path/to/agent-dir
```

Typical global resources include:

```text
~/.pi/agent/
├── settings.json
├── AGENTS.md
├── SYSTEM.md
├── APPEND_SYSTEM.md
├── extensions/
├── skills/
├── prompts/
└── themes/
```

## 2. Custom agents — native Pi vs extension

### Native Pi
Url Documentation: https://pi.dev/packages/pi-open-agents?name=pi-open-agents

The Pi website explicitly describes the core harness as minimal and says it skips features such as **sub-agents**. Therefore there is no native core Pi `agents/*.md` declaration to document as if it were built in.

### `pi-open-agents` package

The official Pi package registry documents a `pi-open-agents` package that adds reusable custom agent roles.

**Global path supplied by that package:**

```text
~/.pi/agent/agents/*.md
```

A role is Markdown with YAML frontmatter, e.g.:

```yaml
---
name: reviewer
description: Review a change for correctness.
model: "@review"
---

Review the assigned change and return concrete findings.
```

This is **package-provided functionality**, not a built-in core Pi feature.

## 3. Global instructions / rules

Pi loads global context files from:

```text
~/.pi/agent/AGENTS.md
```

Pi also supports a global replacement system prompt:

```text
~/.pi/agent/SYSTEM.md
```

or an additive prompt:

```text
~/.pi/agent/APPEND_SYSTEM.md
```

The important distinction is:

- `AGENTS.md` = durable context/instructions;
- `SYSTEM.md` = replace Pi's default system prompt;
- `APPEND_SYSTEM.md` = append to Pi's system prompt.

## 4. Global skills

**Native global path:**

```text
~/.pi/agent/skills/
```

Pi also supports the cross-tool Agent Skills location:

```text
~/.agents/skills/
```

Skills contain `SKILL.md` and optional supporting resources. Pi advertises names/descriptions at startup and loads full instructions on demand.

## 5. Global configuration

```text
~/.pi/agent/settings.json
```

This is the main user-level settings file for preferences, defaults, resource paths, and package declarations.

The configuration documentation lists global files for keybindings, models, credentials, extensions, skills, prompts, and themes under the same agent directory.

## 6. Global map

| Need | Pi global surface |
|---|---|
| Native persistent instructions | `~/.pi/agent/AGENTS.md` |
| Replace system prompt | `~/.pi/agent/SYSTEM.md` |
| Append system prompt | `~/.pi/agent/APPEND_SYSTEM.md` |
| Native global skill | `~/.pi/agent/skills/` |
| Cross-tool skill | `~/.agents/skills/` |
| Settings | `~/.pi/agent/settings.json` |
| Custom agents | Not native core; `pi-open-agents` adds `~/.pi/agent/agents/*.md` |

## 7. Sources

- Pi — Home / harness model: https://pi.dev/
- Pi — Configuration: https://pi.dev/docs/latest/configuration
- Pi — Skills: https://pi.dev/docs/latest/skills
- Pi — Quickstart: https://pi.dev/docs/latest/quickstart
- Pi — `pi-open-agents`: https://pi.dev/packages/pi-open-agents
