# AI Skills — Project Overview

## What it is

AI Skills is a **local skill library** that installs reusable skills globally for Claude Code and Codex with a single `pnpm register` command.

Core idea: skills are maintained centrally in a local repository — change once, use everywhere. New skills are promoted to the global library via `/aisk/create-skill`.

---

## Overall Architecture

```
Local skill repository/
└── skills/              ← skill source files (SK-*.md with optional frontmatter)

  ↓ pnpm register

~/.ai-skills/config.json          ← records the repository path
~/.claude/commands/aisk/          ← Claude Code skill commands
~/.codex/skills/aisk-*/           ← Codex skill directories
```

Installers scan `skills/` at install time — no intermediate manifests. Skills default to both Claude Code and Codex targets. A skill adds `targets: [claude]` frontmatter to opt out of Codex.

---

## Repository Directory Structure

```
{repo}/
├── skills/                        ← all skill files, organized by group
│   ├── skill-format.md            ← canonical skill source format spec
│   ├── arch/
│   │   ├── SK-refresh-arch.md
│   │   └── SK-check-arch.md
│   ├── create-skill/
│   │   ├── SK-create-skill.md
│   │   └── resource/              ← runtime resources (not installed as commands)
│   ├── init-project/
│   │   └── SK-init-project.md
│   ├── set-claude-permission/
│   │   └── SK-set-claude-permission.md  ← has `targets: [claude]` frontmatter
│   ├── setup-precommit/
│   │   └── SK-setup-precommit.md
│   ├── smart-review/
│   │   └── SK-smart-review.md
│   ├── task/
│   │   ├── SK-create-task.md
│   │   ├── SK-start-task.md
│   │   ├── SK-resume-task.md
│   │   ├── SK-verify-step.md
│   │   ├── SK-verify-task.md
│   │   ├── SK-complete-task.md
│   │   └── resource/              ← task document templates
│   └── walkthrough/
│       ├── SK-create-walkthrough.md
│       ├── SK-start-walkthrough.md
│       └── SK-resume-walkthrough.md
├── scripts/
│   ├── setup.ts                   ← pnpm register (runs Claude + Codex setup)
│   ├── setup-claude.ts            ← Claude installer
│   ├── setup-codex.ts             ← Codex installer
│   ├── scan-skills.ts             ← shared scanner: reads SK-*.md frontmatter + H1
│   └── build.ts                   ← syncs skill-format.md and Claude rule files
├── package.json
└── docs/
    └── OVERVIEW.md                ← this document
```

> **Tech stack**: All scripts use TypeScript, invoked via `pnpm <script>`, executed with `node --import tsx`, with CLI argument parsing via CAC where needed.

---

## Per-project Runtime Files

Skills may generate files in the project's `.ai-skills/` directory at runtime. These are **not** installed by `pnpm register` — they are created on demand by individual skills:

- `.ai-skills/architecture.md` — written by `/aisk/refresh-arch`, records project-specific architecture decisions

These files should be added to `.gitignore` (handled by `/aisk/init-project`).

---

## pnpm Scripts Summary

| Command             | Implementation                                 | Purpose                                                          |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm register`     | `scripts/setup.ts`                             | Install skills globally for Claude Code and Codex                |
| `pnpm build`        | `scripts/build.ts`                             | Sync `skill-format.md` and Claude rule files                     |
| `pnpm create-skill` | `skills/create-skill/resource/create-skill.ts` | Write a skill file to `skills/` (called by `/aisk/create-skill`) |
| `pnpm verify`       | —                                              | lint:check + typecheck + test + build                            |

> **Runtime dependency**: Scripts are executed as TypeScript via `node --import tsx`; CLI argument parsing uses CAC where needed.

---

## Management Scripts

### scripts/setup.ts

**Purpose**: Install skills globally for both Claude Code and Codex. Run once on a new machine.

**Operations:**

1. Delegates to `ClaudeSetup` (installs to `~/.claude/commands/aisk/`)
2. Delegates to `CodexSetup` (installs to `~/.codex/skills/aisk-*/`)

**Invocation:**

```bash
pnpm register
```

---

### scripts/scan-skills.ts

**Purpose**: Shared skill scanner used by both installers. Reads each `SK-*.md` file and returns structured `SkillEntry` objects.

**For each skill, infers:**

- `targets`: from optional YAML frontmatter (`targets: [claude]` for Claude-only; default is both)
- `description`: first non-empty line after H1 (used as Claude slash-command description)
- `codex.name`: `aisk-{skill-name}` (derived from filename)
- `codex.description`: `"Use when the user wants to …"` (prefixed from H1 description)
- `codex.shortDescription`: title-cased skill name

---

### scripts/setup-claude.ts

**Purpose**: Claude installer — scans skills and installs to `~/.claude/commands/aisk/`.

**Operations:**

1. Write repository path to `~/.ai-skills/config.json`
2. Scan `skills/` via `scanSkills()`, filter by `targets.claude`
3. Install each skill as `{name}.md` with YAML `description` frontmatter
4. Remove stale `.md` files in `~/.claude/commands/aisk/`

---

### scripts/setup-codex.ts

**Purpose**: Codex installer — scans skills and installs to `~/.codex/skills/aisk-*/SKILL.md`.

**Operations:**

1. Write repository path to `~/.ai-skills/config.json`
2. Scan `skills/` via `scanSkills()`, filter by `targets.codex`
3. Transform each skill: strip Claude-specific `**Usage**` lines, replace `/aisk/x` → `aisk-x`, add YAML frontmatter and Codex Notes section
4. Remove stale `aisk-*` Codex skill directories (preserves third-party skills)

---

### scripts/build.ts

**Purpose**: Sync skill format rules from `skills/skill-format.md` into `.claude/rules/skill-rules.md`. Does not generate install manifests.

**Operations:**

1. Read `skills/skill-format.md` and extract content between EXTRACT markers
2. Sync that content into `.claude/rules/skill-rules.md` (so Claude Code auto-loads format rules when editing SK-\*.md files)

**Invocation:**

```bash
pnpm build
```

Run after editing `skills/skill-format.md`.

---

### skills/create-skill/resource/create-skill.ts

**Purpose**: Write a skill file to the global repository `skills/`.

**Parameters (via CAC):**

```bash
pnpm create-skill -- <file> [--name <n>] [--cleanup] [--force]
```

| Parameter   | Description                                    | Default                    |
| ----------- | ---------------------------------------------- | -------------------------- |
| `<file>`    | Source file path (required)                    | —                          |
| `--name`    | Skill name (target filename without `.md`)     | taken from source filename |
| `--cleanup` | Delete the source file after copying           | false                      |
| `--force`   | Skip conflict confirmation for duplicate names | false                      |

**Called indirectly by the `/aisk/create-skill` command**; users do not typically run this directly.

---

## Skill Target Control

Installers read optional YAML frontmatter from each `SK-*.md` file:

```yaml
---
targets: [claude]
---
```

- No frontmatter → both Claude Code and Codex (default)
- `targets: [claude]` → Claude Code only
- Only one skill currently uses this: `set-claude-permission`

---

## Skill Commands

### /aisk/init-project

**Invocation**: `/aisk/init-project` (no arguments)

**Effect**: Configures a new project to work with globally installed aisk skills:

1. Adds `.ai-skills/` to `.gitignore` (with confirmation)
2. Adds `Read(~/.ai-skills/*)` and `Bash(pnpm --dir {repo} run *)` to `.claude/settings.json`

---

### /aisk/create-skill

**Invocation**: `/aisk/create-skill <file-path>` or `/aisk/create-skill <skill-name>`

**Effect**: Promotes a skill to the global repository.

| Mode       | Argument form                  | Behavior                                                                                                              |
| ---------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| File path  | Path to an existing `.md` file | Passed to `create-skill.ts` for processing                                                                            |
| Skill name | Plain name (e.g. `my-skill`)   | Claude generates content from conversation context, writes to `{repo}/skills/{name}/SK-{name}.md`, calls `pnpm build` |

After execution, `git commit` in the ai-skills repository to persist, then `pnpm register` to apply globally.

---

### /aisk/task/\* — Task workflow

A group of skills for managing structured development tasks with branch-per-task workflow and step-by-step acceptance verification. See `skills/task/README.md` for the full workflow.

| Command         | Description                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| `create-task`   | Initialize a new task: create branch, scaffold task documents, enter work mode |
| `start-task`    | Enter task work mode for the current session (re-run at each new session)      |
| `verify-step`   | Run acceptance checks for a single step                                        |
| `verify-task`   | Run acceptance checks across all steps                                         |
| `complete-task` | Verify task completion, clean up task documents, and prompt to create a PR     |

---

### /aisk/smart-review

**Invocation**: `/aisk/smart-review <target-path> [focus description]`

**Effect**: Iteratively reviews and fixes a target file, module, or directory. Runs up to 3 rounds; pauses on decisions that require user input.

---

### /aisk/refresh-arch / /aisk/check-arch

**`refresh-arch`**: Scans the codebase and generates or refreshes `.ai-skills/architecture.md` with architecture decisions.

**`check-arch`**: Checks whether code changes in a given scope align with the recorded architecture decisions.

---

## Typical Workflows

**Initialize on a new machine:**

```
git clone .../ai-skills ~/code/ai-skills
cd ~/code/ai-skills && pnpm install && pnpm register
```

**Configure a new project:**

```
/aisk/init-project
```

**Promote a temporary skill to a global skill:**

```
/aisk/create-skill .claude/commands/aisk/my-experiment.md
# → git commit in the ai-skills repository
# → pnpm register to apply globally
```
