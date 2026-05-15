# Config File Templates

Generate only the matching version for the project type. Do not keep unused branches. If information is insufficient, use `[TBD]` placeholders.

## Single-package `CLAUDE.md`

```markdown
# <Project Name> Project Conventions (Claude Code)

> This file provides project-level supplemental rules and is layered with global ~/.claude/CLAUDE.md.

## Current Development Phase

**Phase -1 (AI Scaffold) complete -> Phase 0 (Foundation) about to start**

Phase system: Phase -1 establishes conventions -> Phase 0 builds the skeleton -> Phase 1+ delivers features iteratively.

## Convention System

Single source of truth for conventions: `docs/conventions/`

| Convention file | Covers |
| --------------- | ------ |
| `docs/conventions/architecture.md` | Tech choices, architecture layers, prohibited patterns |
| `docs/conventions/coding.md` | Coding standards, naming, comments, component boundaries, commit convention |
| `docs/conventions/testing.md` | Test scope, tools, file locations |
| `docs/conventions/directory.md` | Directory structure, file naming rules |

Before implementing any feature, check the relevant files in `docs/conventions/`. If an implementation conflicts with conventions, describe the conflict and wait for the user to choose "adjust implementation" or "update convention".

## Working Docs

`docs/features/` and `docs/refactors/` provide task context for AI. They complement, not replace, GitHub Issues / Linear / Jira or other project management tools.

Feature development: `docs/features/<feature-id>/`, moved to `docs/features/-<feature-id>/` when complete.
Refactoring work: `docs/refactors/<refactor-id>/`, moved to `docs/refactors/-<refactor-id>/` when complete.

## Available Claude Code Slash Commands

| Command | Purpose |
| ------- | ------- |
| `/check-conventions` | Review recent changes for convention compliance |
| `/update-convention` | Guided flow for convention conflicts |
| `/adr` | Create a new architecture decision record |

## Commit Convention

Format: `type(scope): description`
Example: `feat(auth): implement JWT refresh token`
```

If the phase system is not used, replace "Current Development Phase" with: `**Current phase**: <fill based on actual context, or delete this section>`.

## Monorepo Root `CLAUDE.md`

```markdown
# <Project Name> Project Conventions (Claude Code) — Root

> This file defines shared monorepo rules.
> Claude Code recursively loads parent CLAUDE.md files, so root and package-level conventions are layered automatically when working inside a package.

## Current Development Phase

**Phase -1 (AI Scaffold) complete -> Phase 0 (Foundation) about to start**

## Monorepo Structure

| Package path | Type | Description |
| ------------ | ---- | ----------- |
| `apps/web` | frontend | [brief description] |
| `apps/api` | backend | [brief description] |
| `packages/shared` | shared library | [brief description] |

> Replace this with the actual package list when generating the file. Use `[TBD]` for unknown information, and do not keep example packages that do not apply.

## Convention Layers

- Shared conventions: `docs/conventions/`
- Package-specific conventions: `<pkg-path>/docs/conventions/`
- Conflict rule: package-specific conventions override shared conventions

## Cross-package Dependency Rules

- `packages/shared` must not depend on any `apps/*`
- `apps/web` must not directly depend on `apps/api`; communicate through the API layer
- Record new cross-package dependencies in `docs/conventions/architecture.md`

## Working Docs

Feature development: `docs/features/<feature-id>/` (REQUIREMENTS / DESIGN / PROGRESS)
Refactoring work: `docs/refactors/<refactor-id>/` (MOTIVATION / DESIGN / PROGRESS)
Prefix the directory name with `-` after completion.

## Available Claude Code Slash Commands

| Command | Purpose |
| ------- | ------- |
| `/check-conventions` | Review recent changes for convention compliance |
| `/update-convention` | Guided flow for convention conflicts |
| `/adr` | Create a new architecture decision record |

## Commit Convention

Format: `type(pkg/scope): description`
Example: `feat(web/auth): implement login page`
```

## Monorepo Package-level `CLAUDE.md`

```markdown
# <Package Name> Conventions (Claude Code)

> This file defines package-level rules for `<pkg-path>` and is layered with root CLAUDE.md.
> This file takes precedence over shared conventions. Shared rules still apply where this file does not override them.

## Package Overview

**Type**: frontend / backend / shared library
**Primary responsibility**: [brief description]
**Tech stack**: [framework, UI library, key dependencies]

## Package-specific Conventions

Before implementing, read root shared conventions first, then these package-specific conventions:

| Convention file | Covers |
| --------------- | ------ |
| `<pkg-path>/docs/conventions/architecture.md` | Package architecture, prohibited patterns |
| `<pkg-path>/docs/conventions/coding.md` | Package-specific coding rules |
| `<pkg-path>/docs/conventions/testing.md` | Package-specific testing rules |
| `<pkg-path>/docs/conventions/directory.md` | Package directory structure |

If an implementation conflicts with conventions, describe the conflict and wait for the user to choose "adjust implementation" or "update convention".
```

Remove rows for convention files that were not actually generated.

## `AGENTS.md`

Only generated if the user selects Codex / ChatGPT.

```markdown
# <Project Name> Project Conventions (Codex / ChatGPT)

## Must Read Before Starting

Before implementing any feature, read the relevant convention files in order:

1. `docs/conventions/architecture.md`
2. `docs/conventions/coding.md`
3. `docs/conventions/directory.md`
4. `docs/conventions/testing.md`
5. `docs/conventions/ai-workflow.md`

For monorepos, also confirm the current package and read package-specific conventions under `<pkg-path>/docs/conventions/`.

## Convention Conflict Rule

If an implementation conflicts with a convention file:

1. Describe the conflict precisely, citing the file name and section
2. Offer two options: "adjust implementation to match convention" or "update convention to reflect new decision"
3. Wait for the user to decide

## Working Docs

When continuing an existing feature, read `REQUIREMENTS.md`, `DESIGN.md`, and `PROGRESS.md`; update `PROGRESS.md` after completing incremental work.

When continuing an existing refactor, read `MOTIVATION.md`, `DESIGN.md`, and `PROGRESS.md`; update `PROGRESS.md` after completing incremental work.

## Documentation Consistency Checklist

- [ ] Do code changes require updates to any convention file?
- [ ] Should new dependencies be recorded in `architecture.md`?
- [ ] Did this produce a new architecture decision that needs an ADR?
- [ ] Does `PROGRESS.md` reflect current status?
- [ ] Monorepo: does this violate any cross-package dependency rule?

## Common Workflows

Codex / ChatGPT does not read `.claude/commands/`. When the user asks for a workflow similar to a Claude Code slash command, follow these rules:

### Check Convention Compliance

When the user asks to review changes, check the current diff, or do a task similar to `/check-conventions`:

1. Confirm the review scope: recent git diff, or specific files / directories provided by the user
2. Load relevant conventions: single-package projects read `docs/conventions/`; monorepos read root shared conventions and current package-specific conventions
3. Check naming, TypeScript rules, directory structure, test coverage, comment rules, architecture constraints, new dependency records, and cross-package dependency rules
4. Output a report with "Compliant", "Needs attention", and "Violation"; violations must cite the convention file and section

### Update Project Conventions

When implementation and conventions diverge, or the user asks to update conventions:

1. Classify the conflict: implementation does not match convention, convention is outdated, or a new scenario appeared
2. If implementation should change, identify the specific non-compliant location and provide the direction to fix it
3. If conventions should change, first describe the target convention file and proposed content; update package-specific conventions for one-package impact, or root shared conventions for multi-package impact
4. For significant changes, ask whether an ADR should be created

### Create ADR

When the user asks to create an ADR, or a decision affects multiple modules, is hard to reverse, or chooses an external dependency:

1. Gather the decision summary, scope, context, alternatives, chosen option, consequences, and trade-offs
2. Read `docs/adr/` to find the highest existing number; increment by one for the new file
3. Write global decisions to `docs/adr/<four-digit-number>-<kebab-case-title>.md`; write package-scoped decisions to `docs/adr/<four-digit-number>-<pkg-name>-<kebab-case-title>.md`
4. Update the decision index in `docs/adr/README.md`

## Commit Convention

Single-package format: `type(scope): description`
Monorepo format: `type(pkg/scope): description`
```

## `.github/copilot-instructions.md`

Generate only if the user selected Copilot support.

```markdown
# <Project Name> Copilot Autocomplete Rules

> This file is for IDE autocomplete only, not a complete development convention reference.

## TypeScript

- Always enable strict mode
- Never use `any`; use `unknown` instead
- All functions must declare return types

## Naming Conventions

- React components: PascalCase
- File names: kebab-case
- Variables / functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Comment Rules

- No comments by default
- Only write comments to explain why, never what
```

## `.cursorrules`

Only generated if the user selects Cursor.

```text
Please refer to CLAUDE.md and docs/conventions/ for all project rules and coding standards.
```
