# Hermes Agent — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

Hermes Agent's instance-level home defaults to:

```text
~/.hermes/
```

`HERMES_HOME` can relocate this tree.

A current documented structure includes:

```text
~/.hermes/
├── config.yaml
├── .env
├── SOUL.md
├── memories/
├── skills/
├── sessions/
├── logs/
└── ...
```

Profiles use their own Hermes home resolution.

## 2. Custom agent declaration — important distinction

Hermes does **not** document a Claude/OMP-style global directory of arbitrary named agent definition Markdown files as its primary customization mechanism.

The persistent global identity is:

```text
~/.hermes/SOUL.md
```

`SOUL.md` defines who the Hermes agent is: identity, tone, style, and communication defaults. It is loaded as the agent identity in the system prompt.

Hermes also has **subagent delegation** at runtime, but that is a delegation mechanism rather than a documented `~/.hermes/agents/*.md` declaration format.

Therefore this document deliberately does **not** invent a global `agents/` path for Hermes.

## 3. Global rules / instructions

Hermes separates global identity from project context.

### Global identity

```text
~/.hermes/SOUL.md
```

### Project instructions

Hermes discovers project context files including:

```text
.hermes.md / HERMES.md
AGENTS.override.md
AGENTS.md
CLAUDE.md
.cursorrules
.cursor/rules/*.mdc
```

`AGENTS.md` is the primary project context surface.

Hermes also supports `--ignore-rules` / `HERMES_IGNORE_RULES=1`, which skips automatic rule/context injection and memory injection; explicit skill loading remains available.

## 4. Global skills

**Global skill path:**

```text
~/.hermes/skills/<skill-name>/
```

A skill is a reusable on-demand knowledge/workflow package. Hermes follows the Agent Skills standard and can discover project skills in addition to profile/global skills.

Every installed skill is also exposed as a slash command using the skill name.

## 5. Global configuration

```text
~/.hermes/config.yaml
```

This is the main non-secret configuration file.

Hermes documentation distinguishes this from:

```text
~/.hermes/.env       # secrets
~/.hermes/auth.json  # OAuth/credential state
```

Custom personalities can also be defined in `config.yaml`, but `/personality` is a session-level overlay whereas `SOUL.md` is the durable identity layer.

## 6. Recommended mental model

| Need | Hermes global surface |
|---|---|
| Durable agent identity/persona | `~/.hermes/SOUL.md` |
| Global runtime/settings | `~/.hermes/config.yaml` |
| Global skill | `~/.hermes/skills/<name>/` |
| Project instructions/rules | `AGENTS.md` / `.hermes.md` / supported compatibility files in the project |
| Persisted arbitrary custom agent definition | **Not documented as a native file format** |

## 7. Sources

- Hermes — Which file does what: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/which-file-does-what.md
- Hermes — Context files: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/context-files.md
- Hermes — Personality & SOUL.md: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/personality.md
- Hermes — Skills system: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md
- Hermes — CLI: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/cli.md
- Hermes — Prompt assembly: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/prompt-assembly.md
