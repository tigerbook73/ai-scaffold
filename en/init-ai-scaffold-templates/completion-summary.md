# Completion Summary Template

Based on the project type, output only the matching "Next Steps" version.

```markdown
## AI Scaffold Initialization Complete

### Project Info

- Type: new project / existing project
- Structure: single-package / Monorepo (packages: <list>)
- Phase model: using Phase system / custom / none

### Files Created

**Config files (<N> total)**

- CLAUDE.md (root)
- <pkg-path>/CLAUDE.md (per package, Monorepo)
- AGENTS.md (if applicable: Codex / ChatGPT selected)
- .cursorrules (if applicable: Cursor selected)
- .github/copilot-instructions.md (if applicable: GitHub Copilot selected)

**Convention files (<N> total)**

- docs/conventions/README.md
- docs/conventions/architecture.md
- docs/conventions/coding.md
- docs/conventions/testing.md
- docs/conventions/directory.md
- docs/conventions/ai-workflow.md
- <pkg-path>/docs/conventions/... (per file, Monorepo)
- docs/conventions/graphql.md (if applicable)

**ADR files (<N> total)**

- docs/adr/README.md
- docs/adr/0001-xxx.md (if initial decisions exist, list each)

**Claude Code slash commands (3)**

- .claude/commands/check-conventions.md
- .claude/commands/update-convention.md
- .claude/commands/adr.md

### Skipped Files (already existed, not overwritten)

<list if any; omit this section if none>
```

## New Project Next Steps

```markdown
1. Review `docs/conventions/architecture.md` and confirm the prohibited patterns are complete
2. (Monorepo) Review each package's `docs/conventions/` and confirm it reflects the package tech stack
3. For additional architecture decisions, run `/adr` in Claude Code; in Codex, follow the ADR workflow in `AGENTS.md`
4. Start development (Phase 0 / per custom phase description)
```

## Existing Project Next Steps

```markdown
1. Review the extracted conventions for accuracy, especially architecture.md and directory.md
2. (Monorepo) Review package-specific conventions and confirm they reflect package tech stacks
3. Add anything from "Other Architecture Info" that is not yet reflected in convention files
4. For additional architecture decisions, run `/adr` in Claude Code; in Codex, follow the ADR workflow in `AGENTS.md`
```
