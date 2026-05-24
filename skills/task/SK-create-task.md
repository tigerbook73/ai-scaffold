# create-task

Initialize a new task: create branch, scaffold task documents, and enter work mode.

---

## Constraints

- Only allowed on main or master branch
- Working tree must be clean (no uncommitted changes, no untracked files)
- `docs/tasks/` must contain no existing task directory
- [Write operation] Creates `docs/tasks/{name}/` with task documents and a git commit

## Input

`$ARGUMENTS`: `<task-type> <task-name>`

- `task-type`: `feature` | `refactor`
- `task-name`: kebab-case string describing the task

## Steps

1. Read `~/.ai-skills/config.json` for `{repo}` path.

2. Verify all preconditions; abort with a clear reason if any fail:
   - `git status` shows no changes (staged, modified, or untracked)
   - Current branch is main or master
   - `docs/tasks/` has no subdirectory

3. Create and switch to branch: `feature/{name}` or `refactor/{name}`

4. Create directory `docs/tasks/{name}/`

5. Create `docs/tasks/{name}/.claude/CLAUDE.md` from `{repo}/skills/task/resource/resource-claude.md`,
   replacing `{task-name}` and `{task-type}` placeholders.

6. Create `docs/tasks/{name}/requirements.md` from `{repo}/skills/task/resource/requirements-{task-type}.md`,
   replacing `{task-name}` placeholder.

7. Create `docs/tasks/{name}/design.md` — title only: `# Design: {task-name}`

8. Create `docs/tasks/{name}/task-state.md` from `{repo}/skills/task/resource/task-state.md`,
   replacing `{task-name}` and setting initial values:
   - Metadata `type`: the `task-type` argument (`feature` or `refactor`)
   - Metadata `status`: `in_progress`
   - Current Phase: `requirements (in_progress)`
   - Current Step: `—`
   - Requirements Phase: `status: in_progress` — "task just created, requirements pending"
   - Design / Implementation phases: `status: pending`, no step entries
   - Document Index: `requirements.md`, `design.md`

9. Stage and commit: `git add docs/tasks/{name}/` then `git commit -m "chore: init task {name}"`

10. Enter task work mode (equivalent to start-task): read task-state.md, confirm .claude/CLAUDE.md
    is loaded, output task summary, and prompt user to start planning requirements.
