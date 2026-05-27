# task Skill Group

Skills for managing structured development tasks with branch-per-task workflow, document scaffolding, and step-by-step acceptance verification.

## Workflow Model

Each task maps to one branch and one PR. The workflow enforces this one-to-one relationship:

- **One task at a time** — only one task directory is allowed under `docs/tasks/` at any time.
  A new task can only be created from main/master with a clean working tree.
- **Process documents stay off main** — task documents (`requirements.md`, `design.md`, etc.)
  live on the task branch and are deleted before the PR is merged. They capture thinking in
  progress, not permanent project knowledge.
- **Distill before closing** — before deleting the task documents, extract any architecture
  decisions or significant design choices into the project's permanent documentation.
  `complete-task` prompts for this step explicitly.

## Skills

**`create-task`** — Initialize a new task: create a dedicated branch (`feature/*` or `refactor/*`), scaffold task documents under `docs/tasks/{name}/`, and enter task work mode. Only runs on main/master with a clean working tree.

**`start-task`** — Restore task context for the current session. Reads `task-state.md` and all indexed documents, then outputs a task summary. Re-run at the start of each new session.

**`verify-step`** — Run acceptance checks for a single step (defaults to current step). Supports `auto` (shell commands) and `manual` (human confirmation) modes, with fast and full variants.

**`verify-task`** — Run acceptance checks for the task as a whole against the Task Acceptance conditions in the design document. Supports `auto` (shell commands) and `manual` (human confirmation) modes.

**`complete-task`** — Verify all steps and task-level acceptance are done, then (with confirmation) delete the task directory and commit the cleanup. Prompts the user to create a PR.

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
- `resource/requirements-feature.md` — required sections format spec for feature requirements documents
- `resource/requirements-refactor.md` — required sections format spec for refactor requirements documents
- `resource/design.md` — required sections format spec for design step documents (Step Type, Auto/Manual Verification)
