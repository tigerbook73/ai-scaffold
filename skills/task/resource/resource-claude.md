# Task Mode: {task-name} ({task-type})

Current task directory. This file is auto-loaded when accessing any file in this directory, entering task work mode — natural language instructions default to this task.

**If no task context has been established in the current session**: before responding to any instruction, read `task-state.md` and all documents listed in its Document Index, then output a task summary (current phase, key progress, pending items).

## Task Files

- `task-state.md` — single source of truth for document list and task progress (not splittable)
- All other files are listed in the task-state.md Document Index (requirements/design documents may be split)

## Available Subcommands

The following natural language instructions are valid in task work mode:

- **plan requirements / refresh requirements** — fill in or update the requirements document; sync task-state.md Requirements Phase status
- **plan design / refresh design** — generate design document from requirements (with step breakdown and acceptance conditions); sync task-state.md
- **start implementation / implement step N** — begin coding for Step N per the design document; update task-state.md Current Step
- **commit** — generate a conventional commit message; update task-state.md for the completed step (record commit hash, set status to done)
  - Step commit format: `{type}(step-N): {step-title}` (type matches branch type: feat / refactor)
  - Non-step commits (incidental fixes, doc updates, etc.): standard conventional commits, no step scope
- **run verification / verify** — execute acceptance checks (auto conditions run directly; manual conditions presented to user one by one); results written to task-state.md; may also prompt user to run `/aisk:verify-task`
- **update status from context** — AI infers and updates task-state.md based on current conversation
- **set status to: {description}** — update task-state.md phase status to the given description
- **current status / progress** — read task-state.md and output a summary
- **show unrelated changes** — identify commits in git log unrelated to this task

## Skill Commands

- `/aisk:verify-step [step-N] [auto [--full] | manual]` — verify a single step (defaults to current step)
- `/aisk:verify-task [auto [--full] | manual]` — verify all steps
- `/aisk:complete-task` — complete task (completeness check + document cleanup)
