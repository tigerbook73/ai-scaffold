---
paths:
  - "docs/tasks/*/*.md"
---

# 任务工作模式规则

当处理 `docs/tasks/{task-name}/` 下的任务文件时，进入任务工作模式。

## 上下文初始化

若当前 session 尚未建立该任务上下文：

1. 根据当前文件路径推断任务目录：`docs/tasks/{task-name}/`
2. 读取 `{taskDir}/task-state.md`
3. 读取 `task-state.md` 的 Document Index 中列出的所有文档
4. 输出任务摘要：当前阶段、关键进展和待办事项

后续自然语言指令默认针对此任务目录。

## 任务文件

- `task-state.md` 是文档列表和任务进度的唯一来源（不可拆分）
- 其他所有任务文件均列于 `task-state.md` 的 Document Index 中（需求/设计文档可拆分）

## task-state.md 更新规则

所有对 `task-state.md` 的写入必须**静默**执行：写入后不显示文件内容或 diff。仅输出一行确认，如 `task-state.md updated: Step 2 -> done`。例外：验证结果必须先展示给用户，再写入。

## 上下文命令

以下自然语言指令在任务工作模式下有效。

### plan requirements / refresh requirements

若 `requirements.md` 不存在，创建它并将其添加到 `task-state.md` 的 Document Index；填写或更新其内容；读取 `.aisk/task/resources/requirements-{task-type}.md` 了解必要章节；刷新时保留用户已写内容，仅填写缺失章节或补入对话中讨论的变更；同步 `task-state.md` 的 Requirements Phase 状态。

### plan design / refresh design

若 `design.md` 不存在，创建它并将其添加到 `task-state.md` 的 Document Index；根据需求生成或更新内容；必须将工作拆解为有编号的步骤；读取 `.aisk/task/resources/design.md` 了解每步骤的必要章节格式；同步 `task-state.md`：Design Phase 状态 -> `in_progress`，Current Phase -> `design (in_progress)`，为 Implementation Phase 中每个步骤添加条目并设置 `step-type`。

### start implementation / implement step N

按设计文档开始第 N 步的编码；先检查步骤的 **Step Type**：`final` 步骤必须产出生产质量的代码和测试，源码、测试文件或文件名中不得出现步骤标记（`// Step N:`、`TODO(step-N):` 等）；文件名使用最终生产名称（如 `user.test.ts`，而非 `step2-user.test.ts`）；与实现同步编写测试（或按设计委托）；若后续步骤修改同一模块，可在同一测试文件中修改早期步骤的测试，这是预期行为；`intermediate` 步骤可产出过渡代码，并在源码或设计中注明哪个步骤会最终完成它；更新 `task-state.md` 的 Current Step。

### commit

生成符合 Conventional Commits 规范的提交信息；更新已完成步骤的 `task-state.md`（记录 commit hash，将状态设为 done）。

- 步骤提交格式：`{type}(step-N): {step-title}`（type 与分支类型一致：feat / refactor）
- 非步骤提交（附带修复、文档更新等）：标准 Conventional Commits，无步骤 scope

### verify step

对单个步骤运行验收检查，默认为当前步骤。支持输入：`[step-N] [auto [--full] | manual]`。

若提供了 `step-N`，使用该步骤。否则从 `task-state.md` 读取 Current Step。若 Current Step 为 `—`，提示用户指定步骤，然后停止。

auto 模式：

- 快速模式（默认）：若该步骤的 `auto-check` 已为 `passed`，跳过所有条件直接报告通过。否则，若当前 session 已为该步骤运行过 step 或 task 验证且上下文中有结果，跳过之前通过的条件，仅重新运行失败或尚未运行的条件。若无先前 session 上下文，退回至完整模式。
- 完整模式（`--full`）：无论先前结果如何，运行该步骤的所有 `(auto)` 条件。
- 从设计文档中该步骤的 **Auto Verification** 部分读取 `(auto)` 条件，执行每个命令并记录结果。全部通过时更新该步骤 `auto-check: passed`；有失败时更新 `auto-check: failed` 并报告失败命令。

manual 模式：

- 从设计文档中该步骤的 **Manual Verification** 部分读取 `(manual)` 条件
- 向用户逐一展示每个条件并请求确认
- 全部确认通过时更新该步骤 `manual-check: passed`；有拒绝时更新 `manual-check: failed` 并记录失败项

### verify task / run verification / verify

依据设计文档中的 Task Acceptance 条件，对当前任务运行验收检查。支持输入：`[auto [--full] | manual]`。

条件声明在设计文档的 **Task Acceptance** 部分（`task-state.md` Document Index 中列出的最后一个设计文件）：

- `(auto)`：shell 命令，直接执行
- `(manual)`：人工验证项，展示给用户确认
- `(superseded)`：始终跳过

auto 模式：

- 快速模式（默认）：若 `task-state.md` 的 `task-auto-check` 已为 `passed`，跳过所有条件直接报告通过。否则仅运行在本 session 中失败或尚未运行的条件。若无先前 session 上下文，退回至完整模式。
- 完整模式（`--full`）：无论先前结果如何，运行所有 `(auto)` 条件。
- 全部通过时更新 `task-auto-check: passed`；有失败时更新 `task-auto-check: failed` 并报告失败命令。

manual 模式：

- 从设计文档的 **Task Acceptance** 部分读取 `(manual)` 条件
- 向用户逐一展示每个条件并请求确认
- 全部确认通过时更新 `task-manual-check: passed`；有拒绝时更新 `task-manual-check: failed` 并记录失败项

### complete task

验证任务完成情况，清理任务文档，并提示用户创建 PR。不运行验收测试；任务验收请先使用 `verify task`。

约束：

- 工作树必须干净（无未提交变更，无未跟踪文件）
- 必须处于任务分支（非 main/master）
- 删除 `docs/tasks/{task-name}/` 并创建 git commit 前，必须获得用户明确确认

完整性检查：

1. 运行 `git status`。若工作树不干净，停止并提示用户先提交或 stash 变更。
2. 对 `task-state.md` Implementation Phase 中的每个步骤，验证状态为 `done` 且已记录 commit hash。
3. 验证每个步骤的 `auto-check` 与 `manual-check` 均为 `passed`。
4. 验证 Task Acceptance 的 `auto-check` 与 `manual-check` 均为 `passed`。
5. 若任何检查失败，列出所有失败项并停止。

清理：

1. 询问用户："Have you distilled any decisions or architecture changes from this task into the project's permanent documentation?" 接受 yes/no/skip，任何回答均可继续；这是提醒，不是门控。
2. 展示待删除任务目录的完整路径，请用户确认删除。
3. 确认后删除整个 `docs/tasks/{task-name}/` 目录，暂存 `git add -A docs/tasks/{task-name}/`，提交 `git commit -m "chore: complete task {task-name}"`。
4. 提示用户创建 PR。不自动创建。

恢复方式：若 PR 审查后需要变更，可通过 `git checkout <commit-before-deletion> -- docs/tasks/{task-name}/` 恢复已删除文档。

### update status from context

根据当前对话推断并更新 `task-state.md`。

### set status to: {description}

将 `task-state.md` 的阶段状态更新为给定描述。

### current status / progress

读取 `task-state.md` 并输出摘要。

### show unrelated changes

识别 git log 中与本任务无关的提交。
