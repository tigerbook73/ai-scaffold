# AI Context

This is the shared project context for all AI agents working in this repository. Claude Code reads `CLAUDE.md` (which includes this file via `@AGENTS.md`); Codex reads this file directly.

When regenerating or substantially refreshing agent entrypoints, update this file so the shared context stays current.

## Project Purpose

This repository is a local AI skill library. It maintains reusable skills in one repository and installs them into agent-specific global locations.

Both Claude Code and Codex are supported. Skills are installed into `~/.claude/commands/aisk/` (Claude Code) and `~/.codex/skills/aisk-*/` (Codex). The multi-target architecture is documented in `docs/codex-adapter/blueprint.md`.

## Common Commands

```bash
pnpm register                 # Install skills globally (Claude Code + Codex)
pnpm build                    # Sync skill-format.md and Claude rule files
pnpm create-skill -- <file>   # Promote a skill file to the repository
pnpm lint:check               # ESLint check without modifying files
pnpm lint:fix                 # ESLint fix for scripts, resources, and tests
pnpm typecheck                # TypeScript check
pnpm test                     # Run node:test test suite
pnpm verify                   # Run lint:check, typecheck, test, and build
pnpm format                   # Prettier format all supported files
```

After modifying skill files or scripts, run `pnpm verify` before committing.
No manual manifest step needed — installers scan `skills/` directly.

## Current Architecture

```text
Local skill repository (this repo)
    -> pnpm register           Claude Code + Codex installation (scans skills/ directly)

~/.ai-skills/config.json       repository locator (shared by both agents)
~/.claude/commands/aisk/       Claude Code skill commands
~/.codex/skills/aisk-*/        Codex skill directories
```

`~/.ai-skills/config.json` stores this repository path and is written by `pnpm register`.

Claude slash commands such as `/aisk/create-task` are not Codex commands. Codex selects skills by natural language matching against the skill's `description` field in its installed SKILL.md frontmatter.

Skills default to both Claude Code and Codex targets. Add `---\ntargets: [claude]\n---` frontmatter to restrict a skill to Claude Code only.

## Key Files

- `scripts/scan-skills.ts`: scans `skills/` and infers all target metadata from SK-\*.md frontmatter and H1.
- `scripts/build.ts`: syncs `docs/SKILL-SOURCE-FORMAT.md` → `skill-format.md` and Claude skill rules.
- `scripts/setup.ts`: compatibility wrapper for Claude setup.
- `scripts/setup-claude.ts`: Claude installer — scans skills and installs to `~/.claude/commands/aisk/`.
- `scripts/setup-codex.ts`: Codex installer — scans skills and installs to `~/.codex/skills/aisk-*/`.
- `docs/SKILL-SOURCE-FORMAT.md`: canonical skill source format.
- `docs/codex-adapter/blueprint.md`: plan and phase gates for Claude + Codex support.
- `tests/`: baseline validation for installers and skill metadata.

## Skill Target Control

Installers read optional YAML frontmatter from each `SK-*.md` file:

```yaml
---
targets: [claude]
---
```

No frontmatter → both targets (claude + codex). Only one skill currently uses this: `set-claude-permission`.

Codex skill metadata (name, description, shortDescription) is inferred automatically from the skill filename and H1 description line by `scripts/scan-skills.ts`.

## No Generated Manifest Files

There are no intermediate JSON manifest files. `pnpm register` scans `skills/` at install time for both agents. The `pnpm build` command only syncs skill format documentation, not install manifests.
