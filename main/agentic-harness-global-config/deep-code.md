# Deep Code — Global Agentic Configuration

**Verified:** 2026-09-23

> Scope clarification: “DeepSeek Code” here means **Deep Code**, the open-source terminal/VS Code coding assistant from `lessweb/deepcode-cli`, optimized for DeepSeek models. It is not documentation for the DeepSeek-Coder model family itself.

## 1. Global root

Deep Code uses:

```text
~/.deepcode/
```

for persistent user configuration.

The documented settings file is:

```text
~/.deepcode/settings.json
```

## 2. Custom agent declaration

The current official Deep Code CLI repository documents project/user **instructions** and **skills**, but it does not expose a documented persistent `~/.deepcode/agents/*.md` custom-agent format.

The repository currently has an open feature request for subagent support, which is useful evidence that a Claude/Cursor/OMP-style persistent subagent layer should not be assumed to exist.

Therefore:

```text
Custom named global agents: Not verified / do not assume a native file format.
```

## 3. Global rules / instructions

The repository documents global agent instructions in:

```text
~/.deepcode/AGENTS.md
```

Project initialization can create an `AGENTS.md` for project-specific conventions.

The project repository also contains `.deepcode/AGENTS.md` guidance, but that is repository development guidance, not itself the user's global runtime configuration.

## 4. Global skills

The official CLI README documents the following user-level skill locations, in priority order together with the project locations:

```text
~/.deepcode/skills/<skill-name>/SKILL.md
~/.agents/skills/<skill-name>/SKILL.md
```

Project locations are:

```text
./.deepcode/skills/<skill-name>/SKILL.md
./.agents/skills/<skill-name>/SKILL.md
```

The `.agents/skills` path is the cross-client interoperability location.

### Documentation consistency note

The repository's internal `.deepcode/AGENTS.md` currently describes `~/.agents/skills` as the user-level skill location and calls only the project `.deepcode/skills` path legacy. The public README, however, currently documents **both** `~/.deepcode/skills` and `~/.agents/skills` and explicitly labels the first as Deep Code's native location.

For this reason, this document records **both paths** rather than silently choosing one and presenting it as uniquely authoritative.

## 5. Global configuration

```text
~/.deepcode/settings.json
```

Current documented settings include model/provider environment values, context window settings, permissions, MCP servers, skill enablement, notifications, and other runtime behavior.

Configuration precedence is:

```text
Defaults
  < User settings
  < Project settings
  < Environment variables
```

Project settings live at:

```text
<project-root>/.deepcode/settings.json
```

## 6. Global map

| Need | Deep Code global surface |
|---|---|
| Persistent user instructions | `~/.deepcode/AGENTS.md` |
| Native global skill | `~/.deepcode/skills/` |
| Cross-client global skill | `~/.agents/skills/` |
| Main runtime config | `~/.deepcode/settings.json` |
| Persistent custom named agent | **Not verified** |

## 7. Sources

- Deep Code CLI repository: https://github.com/lessweb/deepcode-cli
- Deep Code README: https://github.com/lessweb/deepcode-cli/blob/main/README-en.md
- Deep Code configuration: https://github.com/lessweb/deepcode-cli/blob/main/docs/configuration_en.md
- Deep Code repository agent guidance: https://github.com/lessweb/deepcode-cli/blob/main/.deepcode/AGENTS.md
- Deep Code issue about subagents: https://github.com/lessweb/deepcode-cli/issues/154
