# create-dev-task

初始化新 dev-task：创建分支和 dev-task 状态文档。后续 dev-task 命令由 `docs/dev-tasks/**/*.md` path rule 识别。

---

## 约束

- 仅允许在 main 或 master 分支上运行
- 工作树必须干净（无未提交变更，无未跟踪文件）
- `docs/dev-tasks/` 下不得已存在 dev-task 目录
- [写操作] 在 `docs/dev-tasks/{name}/` 下创建 dev-task 文档并提交一个 git commit

## 输入

`$ARGUMENTS`：`<dev-task-type> <dev-task-name>`

- `dev-task-type`：`feature` | `refactor`
- `dev-task-name`：描述 dev-task 的 kebab-case 字符串

## 步骤

1. 验证所有前置条件；若任一失败则以明确原因中止：
   - `git status` 显示无变更（staged、modified 或 untracked）
   - 当前分支为 main 或 master
   - `docs/dev-tasks/` 下无子目录

2. 创建并切换到分支：`feature/{name}` 或 `refactor/{name}`

3. 创建目录 `docs/dev-tasks/{name}/`

4. 静默创建脚手架文件：
   - 不向用户展示生成的文件内容或模板展开结果。
   - 尽量使用静默写文件命令/工具。
   - 所有脚手架文件创建完成后，仅输出简短摘要。

5. 从 `.aisk/dev-task/resources/dev-task-state.md` 创建 `docs/dev-tasks/{name}/dev-task-state.md`，
   替换 `{dev-task-name}` 并设置初始值：

- Metadata `type`：`dev-task-type` 参数值（`feature` 或 `refactor`）
- Metadata `status`：`in_progress`
- Current Phase：`requirements (in_progress)`
- Current Step：`—`
- Requirements Phase：`status: in_progress` —— "dev-task just created, requirements pending"
- Design / Implementation phases：`status: pending`，无步骤条目
- Document Index：空（文档在计划阶段创建时逐步添加到此处）

6. 暂存并提交：`git add docs/dev-tasks/{name}/` 然后 `git commit -m "chore: init dev-task {name}"`

7. 读取 `docs/dev-tasks/{name}/dev-task-state.md`，输出 dev-task 摘要，并提示用户开始规划需求。后续处理 `docs/dev-tasks/{name}/` 下的 Markdown 文件时，Claude Code 会通过 dev-task workflow path rule 识别 dev-task 命令。
