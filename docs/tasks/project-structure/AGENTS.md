# 任务模式：project-structure（refactor）

当前任务目录。本 session 中的自然语言指令默认针对此任务。

**若当前 session 尚未建立任务上下文**：在响应任何指令前，先读取 `task-state.md` 及其 Document Index 中列出的所有文档，然后输出任务摘要（当前阶段、关键进展、待办事项）。

## 任务文件

- `task-state.md` —— 文档列表和任务进度的唯一来源（不可拆分）
- 其他所有文件均列于 task-state.md 的 Document Index 中（需求/设计文档可拆分）

## task-state.md 更新规则

所有对 `task-state.md` 的写入必须**静默**执行：写入后不显示文件内容或 diff。仅输出一行确认，如 `task-state.md updated: Step 2 → done`。例外：验证结果必须先展示给用户，再写入。

## 可用子命令

以下自然语言指令在任务工作模式下有效：

- **plan requirements / refresh requirements** —— 若 `requirements.md` 不存在，创建它并将其添加到 `task-state.md` 的 Document Index；填写或更新其内容；读取 `/home/tigerbook73/code/learn/ai/ai-scaffold/skills/task/resource/requirements-refactor.md` 了解必要章节；刷新时保留用户已写内容，仅填写缺失章节或补入对话中讨论的变更；同步 task-state.md 的 Requirements Phase 状态
- **plan design / refresh design** —— 若 `design.md` 不存在，创建它并将其添加到 `task-state.md` 的 Document Index；根据需求生成或更新内容；必须将工作拆解为有编号的步骤；读取 `/home/tigerbook73/code/learn/ai/ai-scaffold/skills/task/resource/design.md` 了解每步骤的必要章节格式；同步 task-state.md：Design Phase 状态 → `in_progress`，Current Phase → `design (in_progress)`，为 Implementation Phase 中每个步骤添加条目并设置 `step-type`
- **start implementation / implement step N** —— 按设计文档开始第 N 步的编码；先检查步骤的 **Step Type**：`final` 步骤必须产出生产质量的代码和测试 —— 源码、测试文件或文件名中不得出现步骤标记（`// Step N:`、`TODO(step-N):` 等）；文件名使用最终生产名称（如 `user.test.ts`，而非 `step2-user.test.ts`）；与实现同步编写测试（或按设计委托）；若后续步骤修改同一模块，可在同一测试文件中修改早期步骤的测试 —— 这是预期行为；`intermediate` 步骤可产出过渡代码 —— 在源码或设计中注明哪个步骤会最终完成它；更新 task-state.md 的 Current Step
- **commit** —— 生成符合 Conventional Commits 规范的提交信息；更新已完成步骤的 task-state.md（记录 commit hash，将状态设为 done）
  - 步骤提交格式：`{type}(step-N): {step-title}`（type 与分支类型一致：feat / refactor）
  - 非步骤提交（附带修复、文档更新等）：标准 Conventional Commits，无步骤 scope
- **run verification / verify** —— 执行验收检查（auto 条件直接运行；manual 条件逐一展示给用户）；结果写入 task-state.md
- **update status from context** —— AI 根据当前对话推断并更新 task-state.md
- **set status to: {description}** —— 将 task-state.md 的阶段状态更新为给定描述
- **current status / progress** —— 读取 task-state.md 并输出摘要
- **show unrelated changes** —— 识别 git log 中与本任务无关的提交
