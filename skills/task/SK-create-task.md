# create-task

Initialize a new Task: create branch, scaffold task documents, and enter work mode.

---

## Constraints

- Only allowed on main or master branch
- Working tree must be clean (no uncommitted changes, no untracked files)
- `docs/tasks/` must contain no existing task directory

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
   - 元信息 类型: the `task-type` argument (`feature` or `refactor`)
   - 元信息 状态: `in_progress`
   - current phase: `requirements（进行中）`
   - current step: `—`
   - requirements phase: `in_progress` — "任务刚创建，需求待规划"
   - design / implementation phases: `pending`, no step entries
   - document index: `requirements.md`, `design.md`

9. Stage and commit: `git add docs/tasks/{name}/` then `git commit -m "chore: init task {name}"`

10. Enter task work mode (equivalent to start-task): read task-state.md, confirm .claude/CLAUDE.md
    is loaded, output task summary, and prompt user to start planning requirements.
