# Task Mode: {task-name} ({task-type})

Current task directory. Natural language instructions in this session default to this task.

**If no task context has been established in the current session**: before responding to any instruction, read `task-state.md` and all documents listed in its Document Index, then output a task summary (current phase, key progress, pending items).

## Task Files

- `task-state.md` — single source of truth for document list and task progress (not splittable)
- All other files are listed in the task-state.md Document Index (requirements/design documents may be split)

## task-state.md Update Rule

All writes to `task-state.md` must be **silent**: do not display the file content or diff after writing. Only output a single confirmation line, e.g. `task-state.md updated: Step 2 → done`. Exception: verification results must be displayed to the user before being written.

## Available Subcommands

The following natural language instructions are valid in task work mode:

- **plan requirements / refresh requirements** — fill in or update `requirements.md`; required sections for `feature` tasks: Goal, Background and Motivation, Functional Requirements, Non-Functional Requirements _(omit if none)_, Out of Scope, Acceptance Criteria; for `refactor` tasks: Goal, Background and Motivation, Scope, Out of Scope, Constraints, Acceptance Criteria; when refreshing an existing document, preserve user-written content and only fill in missing sections or incorporate changes discussed in conversation; sync task-state.md Requirements Phase status
- **plan design / refresh design** — generate or update `design.md` from requirements; must break work into numbered steps; read `{repo}/skills/task/resource/design.md` for required section formats; each step must include: **Step Type** (`intermediate` or `final`), **Auto Verification** section, **Manual Verification** section; for `final` steps, Auto Verification must include at least one functional test command covering the new behavior — not just the existing test suite; high-cost checks (external APIs, visual checks, performance) go to Manual Verification and may be tagged `[automation-candidate]`; sync task-state.md: Design Phase status → `in_progress`, Current Phase → `design (in_progress)`, each step's `step-type` field updated
- **start implementation / implement step N** — begin coding for Step N per the design document; check the step's **Step Type** first: `final` steps must produce production-quality code and tests — no step markers (`// Step N:`, `TODO(step-N):`, etc.) in source, test files, or file names; file names use final production names (e.g. `user.test.ts`, not `step2-user.test.ts`); write tests alongside implementation (or per design delegation); if a later step works on the same module, it may modify tests from earlier steps in the same test file — this is expected; `intermediate` steps may produce transitional code — note in source or design which step finalizes it; update task-state.md Current Step
- **commit** — generate a conventional commit message; update task-state.md for the completed step (record commit hash, set status to done)
  - Step commit format: `{type}(step-N): {step-title}` (type matches branch type: feat / refactor)
  - Non-step commits (incidental fixes, doc updates, etc.): standard conventional commits, no step scope
- **run verification / verify** — execute acceptance checks (auto conditions run directly; manual conditions presented to user one by one); results written to task-state.md
- **update status from context** — AI infers and updates task-state.md based on current conversation
- **set status to: {description}** — update task-state.md phase status to the given description
- **current status / progress** — read task-state.md and output a summary
- **show unrelated changes** — identify commits in git log unrelated to this task
