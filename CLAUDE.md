# CLAUDE.md

This file provides Claude Code-specific guidance for this repository.

Read `docs/AI-CONTEXT.md` for shared project context, commands, architecture, and generated-file rules. When regenerating or substantially refreshing this file, also review and update `docs/AI-CONTEXT.md`.

## Claude-specific Notes

- The current production target is Claude Code commands installed under `~/.claude/commands/aisk/`.
- Run `pnpm register` for one-time Claude setup on a new machine.
- For a new project, run `/aisk/init-project` in Claude Code to configure `.gitignore` and Claude permissions.
- Claude slash commands such as `/aisk/create-task` are not Codex commands.
