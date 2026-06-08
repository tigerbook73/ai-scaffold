# create-task

初始化新任务：创建分支、搭建任务文档，并进入工作模式。

---

## 约束

- 仅允许在 main 或 master 分支上运行
- 工作树必须干净（无未提交变更，无未跟踪文件）
- `docs/tasks/` 下不得已存在任务目录
- [写操作] 在 `docs/tasks/{name}/` 下创建任务文档并提交一个 git commit

## 输入

`$ARGUMENTS`：`<task-type> <task-name>`

- `task-type`：`feature` | `refactor`
- `task-name`：描述任务的 kebab-case 字符串

## 步骤

1. 验证所有前置条件；若任一失败则以明确原因中止：
   - `git status` 显示无变更（staged、modified 或 untracked）
   - 当前分支为 main 或 master
   - `docs/tasks/` 下无子目录

2. 创建并切换到分支：`feature/{name}` 或 `refactor/{name}`

3. 创建目录 `docs/tasks/{name}/`

4. 静默创建脚手架文件：
   - 不向用户展示生成的文件内容或模板展开结果。
   - 尽量使用静默写文件命令/工具。
   - 所有脚手架文件创建完成后，仅输出简短摘要。

5. 从 `.aisk/task/resources/task-context.md` 创建 `docs/tasks/{name}/AGENTS.md`，
   替换 `{task-name}` 和 `{task-type}` 占位符。

6. 创建 `docs/tasks/{name}/.claude/CLAUDE.md` 作为精简的 Claude Code 入口文件，内容为：
   `@../AGENTS.md`

7. 从 `.aisk/task/resources/task-state.md` 创建 `docs/tasks/{name}/task-state.md`，
   替换 `{task-name}` 并设置初始值：

- Metadata `type`：`task-type` 参数值（`feature` 或 `refactor`）
- Metadata `status`：`in_progress`
- Current Phase：`requirements (in_progress)`
- Current Step：`—`
- Requirements Phase：`status: in_progress` —— "task just created, requirements pending"
- Design / Implementation phases：`status: pending`，无步骤条目
- Document Index：空（文档在计划阶段创建时逐步添加到此处）

8. 暂存并提交：`git add docs/tasks/{name}/` 然后 `git commit -m "chore: init task {name}"`

9. 进入任务工作模式（等同于 start-task）：读取 task-state.md，确认 .claude/CLAUDE.md 已加载，输出任务摘要，并提示用户开始规划需求。
