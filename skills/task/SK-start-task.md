# start-task

Restore task context for the current session.

**Steps**

1. Check if a `task-state.md` exists under `docs/tasks/*/` in the repository root.
   If none is found, prompt the user to run create-task first, then stop.
   If multiple are found, ask the user which task to restore.
2. Read `task-state.md` and all documents listed in its Document Index (requirements and design files).
3. Output task summary: current phase, key progress, and pending items.
