# AI Skills

A local AI skill library for Claude Code and Codex. Install all skills globally with a single command.

## Setup (one-time per machine)

```bash
git clone .../ai-skills ~/code/ai-skills
cd ~/code/ai-skills && pnpm install && pnpm register
```

After this:

- `~/.ai-skills/config.json` records this repository's path
- Skill commands are installed to `~/.claude/commands/aisk/` (Claude Code)
- Skills are installed to `~/.codex/skills/aisk-*/SKILL.md` (Codex)

## Using skills in a new project

Run the following once in any new project's Claude Code session:

```
/aisk/init-project
```

This configures `.gitignore` and local permissions. No per-project sync needed — skills are already globally available after `pnpm register`.

## Available skills

All skills are available in both Claude Code and Codex, except `set-claude-permission` which is Claude Code only.

### Project setup

| Skill                   | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `init-project`          | Configure a new project to work with globally installed aisk skills                    |
| `set-claude-permission` | Organize the `.claude/settings.local.json` permission configuration (Claude Code only) |
| `setup-precommit`       | Configure a git pre-commit hook using lint-staged                                      |

### Architecture

| Skill          | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `refresh-arch` | Scan the codebase and generate or refresh `.ai-skills/architecture.md` |
| `check-arch`   | Check whether code changes align with architecture decisions           |

### Task workflow

| Skill           | Description                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| `create-task`   | Initialize a new task: create branch, scaffold task documents, enter work mode |
| `start-task`    | Enter task work mode for the current session (re-run at each new session)      |
| `verify-step`   | Run acceptance checks for a single step                                        |
| `verify-task`   | Run acceptance checks across all steps                                         |
| `complete-task` | Verify task completion, clean up task documents, and prompt to create a PR     |

### Code review & learning

| Skill                | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `smart-review`       | Iteratively review and fix a specified file, module, or directory |
| `create-walkthrough` | Create or resume a walkthrough of changes at a target version     |

### Skill management

| Skill          | Description                                   |
| -------------- | --------------------------------------------- |
| `create-skill` | Promote a skill file to the global repository |

## Adding a new skill

Have Claude generate one from a description:

```
/aisk/create-skill my-skill
```

Or promote an existing file:

```
/aisk/create-skill path/to/my-skill.md
```

After adding, run `pnpm verify` then `git commit` to persist, then `pnpm register` to apply globally.

## Repository structure

```
skills/           # skill source files, organized by group
scripts/
  setup.ts        # pnpm register — installs Claude Code + Codex skills
  setup-claude.ts # Claude installer implementation
  setup-codex.ts  # Codex installer implementation
  scan-skills.ts  # shared skill scanner (reads SK-*.md frontmatter)
  build.ts        # syncs skill-format.md and Claude rule files (pnpm build)
docs/
  OVERVIEW.md     # full design documentation
```
