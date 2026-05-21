# task Skill Group Design

The `task` skill group contains two skills: `prepare-task` (start a cross-session task) and `close-task` (complete and clean up).

---

## Core Design Philosophy

AI coding sessions are stateless — when a conversation ends, context disappears. For feature or refactor tasks that span multiple sessions, there needs to be a way to pass state between sessions.

The `task` skill group's solution: **use files as the state carrier** and git branches as the task isolation boundary.

- `docs/tasks/{name}/` directory = global state of the task
- `feature/{name}` or `refactor/{name}` branch = code boundary of the task
- `PROGRESS.md` = the entry point for the AI to restore context in a new session

---

## prepare-task Design

### Why a new branch is required

The branch constraint is not just a git hygiene habit — it has two practical purposes:
1. **Isolation**: task documents (`docs/tasks/`) and code changes are on the same branch, and are handled together when merged
2. **Identification**: `close-task` automatically infers the task name from the branch name, eliminating the need for the user to re-enter it

Operating on the main trunk breaks both of these, so execution is refused.

### Why only two files are created (no DESIGN.md)

`prepare-task` only creates `REQUIREMENTS.md` (requirements) and `PROGRESS.md` (progress).

DESIGN.md is not created at initialization because generating a design before requirements are confirmed tends to produce wasted work. The design phase is triggered explicitly by the user after requirements reach `status: confirmed`.

### Why feature and refactor have different REQUIREMENTS.md templates

The nature of "done criteria" differs between the two:
- `feature`: acceptance criteria described in terms of user behavior (use cases + expected outcomes)
- `refactor`: done criteria described in terms of code state (scope + constraints + observable results)

Using the same template for both would make one of them structurally wrong; separate templates provide the right structural guidance for each.

---

## close-task Design

### Why validation conditions are required

`close-task` has two mandatory checks before execution: a clean working tree + `PROGRESS.md` stage at `completed`.

These are not formalities — they prevent accidental operations:
- A dirty working tree means there are uncommitted changes; deleting task documents at this point can cause the documents and the code state to diverge
- A stage not yet at `completed` means the task is not actually done; deleting the documents would lose the progress record

### Why close-task does not trigger refresh-arch

Separation of concerns: the end of a task does not mean architecture decisions need to be updated. Whether to refresh `architecture.md` is the developer's call; `close-task` is only responsible for cleaning up task documents. Forcing `refresh-arch` would introduce unnecessary coupling.

---

## Lifecycle of the docs/tasks/ directory

```
prepare-task        → creates docs/tasks/{name}/
[development]       → REQUIREMENTS → DESIGN → PROGRESS gradually filled in
close-task          → validates + deletes docs/tasks/{name}/
merge to main       → branch deleted
```

Task document lifecycle is strictly scoped to the task branch and does not follow the code into the main trunk.
