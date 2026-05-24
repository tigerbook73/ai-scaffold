# start-task

Enter task work mode for the current session. `resume-task` is an alias with identical behavior.

**Constraints**

- Current branch must be a task branch (not main/master)
- Context is session-scoped; re-run at the start of each new session

**Steps**

1. Read the current branch name. If it is `main` or `master`, stop and prompt the user to
   switch to a task branch first.
2. Search `docs/tasks/` for directories containing `task-state.md`:
   - None found → prompt user to run create-task first, stop
   - Multiple found → error; ask user to specify which directory, stop
   - Exactly one found → continue
3. Read `task-state.md` and all documents listed in its document index (requirements and design files).
4. Output task summary: current phase, key progress, and pending items.
