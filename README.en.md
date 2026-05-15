# AI Scaffold

AI Scaffold is a tool for initializing an AI engineering convention system in a software project.

It works for both new projects and existing projects. You can give it to an AI coding assistant such as Claude Code, and the assistant will generate a durable set of engineering conventions, AI workflow rules, and project collaboration documents inside the target project.

## What It Does

AI Scaffold generates a project-level AI engineering system. The generated system generally includes:

- AI coding assistant entry files, such as `CLAUDE.md` and `AGENTS.md`
- Project engineering conventions for architecture, coding, testing, directory structure, and AI workflows
- ADR documentation structure for recording important technical decisions
- Feature and refactor working-document folders, so AI assistants can read task context consistently
- Claude Code slash commands for convention checks, convention updates, and ADR creation
- Shared and package-level convention layers for monorepos

The result is not a one-time instruction file. It is a set of project rules that AI coding assistants can keep reading and following during future work.

## How To Use It

Using Claude Code as an example:

1. Choose a language directory:
   - `en/`: generate English conventions
   - `zh-CN/`: generate Simplified Chinese conventions
2. Copy the contents of the selected language directory into the Claude Code commands directory:

```bash
mkdir -p ~/.claude/commands
cp en/init-ai-scaffold.md ~/.claude/commands/
cp -R en/init-ai-scaffold-templates ~/.claude/
```

3. Open Claude Code in your project directory:

```bash
cd your-project
claude
```

4. Run this command in Claude Code:

```text
/init-ai-scaffold
```

The command first detects whether the current project is new or existing, and whether it is a single-package project or a monorepo. It then generates files that match the detected project shape.

## What You Get

After the command finishes, your project will contain a set of AI-readable, executable, and maintainable engineering-system files.

Common outputs include:

- `CLAUDE.md`
- `AGENTS.md`
- `docs/conventions/`
- `docs/adr/`
- `docs/features/`
- `docs/refactors/`
- `.claude/commands/`

The generated `.claude/commands/` directory includes:

- `/check-conventions`: review recent changes or specific files against the relevant project conventions
- `/update-convention`: guide convention updates when implementation and documentation diverge
- `/adr`: create a new Architecture Decision Record and update the ADR index

These slash commands are Claude Code-specific. Codex does not load commands from `.claude/commands/`; it should use `AGENTS.md` and `docs/conventions/` instead.

With Codex, ask for the same workflows in natural language, for example:

- "Review the current diff against `AGENTS.md` and `docs/conventions/`."
- "Create an ADR for this architecture decision."
- "Update the relevant convention because the implementation has changed."

You can then ask your AI coding assistant to build features, check changes, add ADRs, or update project conventions when implementation and documentation diverge.

For existing projects, the workflow pauses when target files already exist, so existing content is not overwritten without a conflict-resolution step.
