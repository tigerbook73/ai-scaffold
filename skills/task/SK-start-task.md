# start-task

Restore task context for the current session.

**Steps**

1. Check if `task-state.md` exists in the current directory.
   If not found, prompt the user to switch to the task branch or run create-task first, then stop.
2. Read `task-state.md` and all documents listed in its Document Index (requirements and design files).
3. Output task summary: current phase, key progress, and pending items.
