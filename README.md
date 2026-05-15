# AI Scaffold

AI Scaffold is a prompt/specification package for initializing a consistent AI-assisted engineering convention system in software projects.

It defines the `/init-ai-scaffold` workflow for new projects, existing projects, and monorepos. The workflow helps an AI coding assistant generate project convention files, AI tool configuration, ADR documentation, working-doc folders, and slash commands.

## Contents

| File | Description |
| --- | --- |
| `init-ai-scaffold.md` | English `/init-ai-scaffold` command specification. Generated convention Markdown files are written in English. |
| `init-ai-scaffold.cn.md` | Chinese `/init-ai-scaffold` command specification. Generated convention Markdown files are written in Chinese, while code comments, commit messages, and file names stay in English. |

## What The Scaffold Generates

The command specification is designed to create a project-level AI engineering system with:

- `CLAUDE.md` for Claude Code project conventions
- `AGENTS.md` for OpenAI Codex / ChatGPT project conventions
- Optional `.github/copilot-instructions.md` for GitHub Copilot autocomplete rules
- `docs/conventions/` for architecture, coding, testing, directory, and AI workflow conventions
- `docs/adr/` for Architecture Decision Records
- `docs/features/` and `docs/refactors/` for AI-readable working documents
- `.claude/commands/` slash commands for convention checks, convention updates, and ADR creation
- Monorepo-aware shared and package-specific convention layers

## Core Ideas

### Learning Tests vs Production Tests

The scaffold distinguishes between two types of tests:

- Learning tests validate understanding of third-party library or API behavior. They do not run in CI and can be deleted freely.
- Production tests verify business logic and remain in CI as long-term refactoring safety nets.

### Project Phases

For new projects, the scaffold can use a lightweight phase model:

| Phase | Name | Purpose |
| --- | --- | --- |
| Phase -1 | AI Scaffold | Establish project conventions and AI workflow |
| Phase 0 | Foundation | Build project skeleton, CI/CD, and base dependencies |
| Phase 1+ | Feature Development | Deliver features iteratively |

Existing projects may skip this model or define their own phases.

### Monorepo Convention Layers

Monorepos use two convention layers:

| Layer | Location | Purpose |
| --- | --- | --- |
| Shared | `docs/conventions/` | Rules that apply across all packages |
| Package-specific | `<pkg-path>/docs/conventions/` | Rules that override or extend shared rules for one package |

Claude Code can merge root and package-level `CLAUDE.md` files through recursive loading. Codex / ChatGPT uses `AGENTS.md`, which explicitly lists all must-read convention files.

## Workflow Summary

1. Detect whether the target is a new project or an existing project.
2. Detect whether the target is a single-package project or monorepo.
3. For new projects, collect project information from a structured form.
4. For existing projects, detect scaffold file conflicts before reading project details.
5. Generate configuration files, convention docs, ADR files, working-doc folders, and slash commands.
6. For monorepos, generate root shared conventions and only the package-specific files that add meaningful rules.
7. Report created files, skipped files, project type, phase model, and next steps.

## Generated Slash Commands

| Command | Purpose |
| --- | --- |
| `/check-conventions` | Review code changes against the relevant convention files |
| `/update-convention` | Resolve conflicts between implementation and conventions |
| `/adr` | Create a new Architecture Decision Record and update the ADR index |

## Usage

Use the appropriate command spec as source material for an AI coding assistant:

1. Choose `init-ai-scaffold.md` for English conventions or `init-ai-scaffold.cn.md` for Chinese conventions.
2. Provide the selected file as the implementation instruction for `/init-ai-scaffold`.
3. Run the command in the target project.
4. Review the generated convention files before starting feature work.

For existing projects, the workflow intentionally pauses if target scaffold files already exist. This prevents accidental overwrites and lets the user choose whether to back up, skip, or merge conflicting files.

## Commit Convention

The scaffold standardizes on Conventional Commits.

Single-package format:

```text
type(scope): description
```

Example:

```text
feat(auth): implement JWT refresh token
```

Monorepo format:

```text
type(pkg/scope): description
```

Example:

```text
feat(web/auth): implement login page
```

When using slash-separated scopes with commitlint, the generated conventions include a note to relax or customize scope validation.

## Design Principles

- Do not fabricate unknown project decisions; use `[TBD]` placeholders when information is missing.
- Keep generated files specific to the detected project type.
- Avoid redundant package-level monorepo conventions when shared rules are enough.
- Treat ADRs as one decision per independent technology choice or design constraint.
- Preserve existing project files unless the user explicitly chooses an overwrite or backup strategy.
