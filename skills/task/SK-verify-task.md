# verify-task

依据设计文档中的 Task Acceptance 条件，对当前任务运行验收检查。

---

## 约束

- 必须处于任务工作模式（当前 session 已执行 start-task）
- [写操作] 更新 `task-state.md` 中的 Task Acceptance 字段

## 输入

`$ARGUMENTS`：`[auto [--full] | manual]`（可选）

- `auto` —— 运行 auto 类型条件（默认：快速模式）
- `auto --full` —— 从头运行所有 auto 类型条件
- `manual` —— 向用户展示 manual 类型条件，等待人工确认
- _（省略）_ —— 提示用户选择 auto 或 manual

## 条件类型

条件声明在设计文档的 **Task Acceptance** 部分
（`task-state.md` Document Index 中列出的最后一个设计文件）：

- `(auto)` —— shell 命令；直接执行
- `(manual)` —— 人工验证项；展示给用户确认
- `(superseded)` —— 始终跳过

## 步骤

### 无参数

提示用户选择：auto 或 manual。然后按所选模式继续。

### auto 模式

**快速模式**（默认）：若 `task-state.md` 的 `task-auto-check` 已为 `passed`，跳过所有
条件直接报告通过。否则仅运行在本 session 中失败或尚未运行的条件。若无先前 session 上下文，退回至完整模式。

**完整模式**（`--full`）：无论先前结果如何，运行所有 `(auto)` 条件。

1. 从设计文档的 **Task Acceptance** 部分读取 `(auto)` 条件。
2. 执行每个条件的命令并记录结果（pass / fail）。
3. 若全部通过：在 `task-state.md` 中更新 `task-auto-check: passed`。
   若有失败：更新 `task-auto-check: failed`，报告哪些命令失败。

### manual 模式

1. 从设计文档的 **Task Acceptance** 部分读取 `(manual)` 条件。
2. 向用户逐一展示每个条件并请求确认。
3. 若用户确认全部通过：在 `task-state.md` 中更新 `task-manual-check: passed`。
   若有拒绝：更新 `task-manual-check: failed`，记录哪些项目失败。
