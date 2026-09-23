# VS Code GitHub Copilot — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

VS Code's current Agent customization system exposes user-level customization files from the user's home directory. The supported global roots relevant here are:

```text
~/.copilot/
├── agents/
├── instructions/
└── skills/
```

VS Code also recognizes Claude-compatible user paths for the same customization categories, but those are compatibility paths, not the Copilot-native root.

## 2. Custom agents

Custom agents are Markdown files using the `.agent.md` convention.

**Global user path:**

```text
~/.copilot/agents/<agent-name>.agent.md
```

The frontmatter can define, among other fields:

```yaml
---
name: Planner
description: Generate implementation plans.
tools:
  - search/codebase
  - web/fetch
model:
  - Claude Sonnet 4.5
  - GPT-5.2
agents: []
user-invocable: true
disable-model-invocation: false
---

You are a planning agent...
```

The exact supported frontmatter is product-defined. Current VS Code documentation lists `description`, `name`, `argument-hint`, `tools`, `agents`, `model`, `user-invocable`, `disable-model-invocation`, `target`, `mcp-servers`, `handoffs`, and preview `hooks` among the supported fields.

**Workspace path:**

```text
.github/agents/
```

VS Code also supports Claude-format agents from `.claude/agents/` and the user-level `~/.claude/agents/` path.

## 3. Global rules / instructions

VS Code separates **custom agents** from **custom instructions**.

User-level instruction files live under:

```text
~/.copilot/instructions/
```

These instructions are the VS Code-native equivalent of persistent coding guidelines such as coding standards, framework conventions, and file-scoped rules.

Claude-compatible instruction/rule files are also supported from:

```text
~/.claude/rules/
```

Do not confuse `chat.instructionsFilesLocations` with the current storage contract: VS Code marks that setting as deprecated for the Local agent and directs users to the supported customization paths.

## 4. Global skills

VS Code implements the Agent Skills format.

**Copilot-native user path:**

```text
~/.copilot/skills/<skill-name>/SKILL.md
```

A portable skill contains a `SKILL.md` with YAML frontmatter, for example:

```yaml
---
name: react-review
description: Review React code for architecture, accessibility, and performance issues.
---

# React review

Apply the project review workflow...
```

VS Code additionally discovers compatible user skills from:

```text
~/.claude/skills/
~/.agents/skills/
```

## 5. Main global configuration

There is not one monolithic `~/.copilot/agent-config.json` that defines the whole agentic system. The current architecture is split across:

- custom agent files;
- instruction files;
- skill directories;
- VS Code settings that enable or tune agent functionality.

Relevant settings currently documented include:

```text
chat.useAgentSkills
chat.agentSkillsLocations       # deprecated; Local agent only
chat.agentFilesLocations        # deprecated; Local agent only
github.copilot.chat.cli.customAgents.enabled
github.copilot.chat.organizationCustomAgents.enabled
github.copilot.chat.skillTool.enabled
```

## 6. What belongs where

| Need | Global surface |
|---|---|
| Reusable specialist agent | `~/.copilot/agents/*.agent.md` |
| Always-on coding guidance | `~/.copilot/instructions/` |
| On-demand workflow / capability | `~/.copilot/skills/<name>/SKILL.md` |
| Runtime feature switches | VS Code settings |

## 7. Sources

- VS Code — Custom agents: https://code.visualstudio.com/docs/agent-customization/custom-agents
- VS Code — Custom instructions: https://code.visualstudio.com/docs/agent-customization/custom-instructions
- VS Code — Agent Skills: https://code.visualstudio.com/docs/agent-customization/agent-skills
- VS Code — AI settings reference: https://code.visualstudio.com/docs/agents/reference/ai-settings
