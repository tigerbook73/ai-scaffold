# task Skill Group

Skills for managing structured development tasks with branch-per-task workflow, document scaffolding, and step-by-step acceptance verification.

## Skills

**`create-task`** — Initialize a new task: create a dedicated branch (`feature/*` or `refactor/*`), scaffold task documents under `docs/tasks/{name}/`, and enter task work mode. Only runs on main/master with a clean working tree.

**`start-task`** (`resume-task` is an alias) — Enter task work mode for the current session. Reads `task-state.md` and all indexed documents, then outputs a task summary. Re-run at the start of each new session.

**`verify-step`** — Run acceptance checks for a single step (defaults to current step). Supports `auto` (shell commands) and `manual` (human confirmation) modes, with fast and full variants.

**`verify-task`** — Run acceptance checks across all steps. Same auto/manual/fast/full logic as verify-step, applied to every step in the implementation phase.

**`complete-task`** — Verify all steps are done and accepted, then (with confirmation) delete the task directory and commit the cleanup. Prompts the user to create a PR.

## Typical workflow

```
# On main branch, start a new feature task
/aisk/create-task feature product-search

# In a new session, restore task context
/aisk/start-task

# After implementing a step, run acceptance checks
/aisk/verify-step auto
/aisk/verify-step manual

# Verify all steps at once
/aisk/verify-task auto --full

# When all steps are done and accepted, close the task
/aisk/complete-task
```

## Task document structure

```
docs/tasks/{task-name}/
├── .claude/
│   └── CLAUDE.md       ← auto-loaded by Claude Code when accessing any file in this directory
├── AGENTS.md           ← auto-loaded by Codex when working in this directory
├── requirements.md
├── design.md
└── task-state.md       ← single source of truth for progress
```

## Resource files

Templates used by `create-task` to scaffold task documents:

- `resource/task-context.md` — task work mode context template (installed as both CLAUDE.md and AGENTS.md)
- `resource/task-state.md` — task-state.md format template
- `resource/design.md` — design document step format reference
- `resource/requirements-feature.md` — requirements template for feature tasks
- `resource/requirements-refactor.md` — requirements template for refactor tasks
- `resource/instructions.md` — developer guide for common scenarios
