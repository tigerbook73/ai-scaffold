# AI Scaffold

AI Scaffold is a tool for generating AI engineering conventions in new or existing software projects.

It gives AI coding assistants a project-level system for how to read the codebase, follow engineering rules, record decisions, and continue feature or refactor work with consistent context.

## Usage

Choose a language guide:

- [English](README.en.md)
- [简体中文](README.zh-CN.md)

Using Claude Code, create `~/.claude/commands`, copy the contents of the selected language directory into it, then open Claude Code in your project and run:

```text
/init-ai-scaffold
```

## Result

After running the command, the target project gets files such as `CLAUDE.md`, `AGENTS.md`, `docs/conventions/`, `docs/adr/`, `docs/features/`, `docs/refactors/`, and `.claude/commands/`.

The generated `.claude/commands/` files are Claude Code slash commands:

- `/check-conventions`: review recent changes or specific files against project conventions
- `/update-convention`: update conventions when implementation and documentation diverge
- `/adr`: create an Architecture Decision Record and update the ADR index

Codex does not use the Claude Code slash command directory. It should read `AGENTS.md` and `docs/conventions/`; ask it in natural language to perform the same workflows.
