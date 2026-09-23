# oh-my-pi (OMP) — Global Agentic Configuration

**Verified:** 2026-09-23

## 1. Global root

OMP's native global agent directory is:

```text
~/.omp/agent/
```

A named OMP profile relocates the active native tree under:

```text
~/.omp/profiles/<profile>/agent/
```

`PI_CODING_AGENT_DIR` can relocate the default agent directory; `OMP_PROFILE` / `PI_PROFILE` select profiles.

## 2. Global custom agents

OMP natively discovers role-backed custom agents from:

```text
~/.omp/agent/agents/*.md
```

A typical definition is:

```yaml
---
name: reviewer
description: Review a change for correctness.
model: "@review"
---

Review the assigned change and report concrete findings.
```

The model role can be resolved from the global mapping in:

```text
~/.omp/agent/config.yml
```

Example:

```yaml
modelRoles:
  review: openai/gpt-5.4:high
```

Project agents live in:

```text
.omp/agents/*.md
```

## 3. Global rules / context

OMP has two important native global instruction surfaces.

### Global context

```text
~/.omp/agent/AGENTS.md
```

This is user-level context for every session.

### Global sticky rules

```text
~/.omp/agent/RULES.md
```

`RULES.md` is special in OMP: it is loaded as an **always-apply sticky rule**, rather than ordinary opening context.

OMP also has native modular rules under:

```text
~/.omp/agent/rules/*.{md,mdc}
```

## 4. Global skills

**Native global path:**

```text
~/.omp/agent/skills/<skill-name>/SKILL.md
```

OMP also has a broad compatibility layer that can discover skills from other provider ecosystems, including Claude, Codex, Gemini, OpenCode, and the Agent Skills-compatible `.agents/skills` tree.

For a deterministic OMP-native setup, prefer `~/.omp/agent/skills/`.

## 5. Global configuration

The main persistent configuration is:

```text
~/.omp/agent/config.yml
```

OMP retains compatibility with an existing:

```text
~/.omp/agent/config.yaml
```

and can migrate a legacy:

```text
~/.omp/agent/settings.json
```

The settings docs state that `config.yml` is the canonical write target.

## 6. Discovery and precedence

OMP's discovery system is broader than a single native tree. It can read provider files from other ecosystems. The native `.omp` provider has the highest discovery priority, and OMP documents a provider priority chain for skills/context.

Therefore, for a new global OMP-only setup, the deterministic native structure is:

```text
~/.omp/agent/
├── config.yml
├── AGENTS.md
├── RULES.md
├── agents/
├── rules/
├── skills/
├── prompts/
└── ...
```

## 7. Global map

| Need | OMP global surface |
|---|---|
| Specialist role | `~/.omp/agent/agents/*.md` |
| Persistent user context | `~/.omp/agent/AGENTS.md` |
| Hard/always-on rule | `~/.omp/agent/RULES.md` |
| Modular rules | `~/.omp/agent/rules/` |
| Skill | `~/.omp/agent/skills/` |
| Runtime config | `~/.omp/agent/config.yml` |

## 8. Sources

- OMP — Task agent discovery: https://github.com/can1357/oh-my-pi/blob/main/docs/task-agent-discovery.md
- OMP — Context files: https://github.com/can1357/oh-my-pi/blob/main/docs/context-files.md
- OMP — Skills: https://github.com/can1357/oh-my-pi/blob/main/docs/skills.md
- OMP — Settings: https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md
- OMP — Config usage: https://github.com/can1357/oh-my-pi/blob/main/docs/config-usage.md
