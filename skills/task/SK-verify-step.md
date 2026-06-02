# verify-step

对单个步骤运行验收检查，默认为当前步骤。

---

## 约束

- 必须处于任务工作模式（当前 session 已执行 start-task）
- [写操作] 更新 `task-state.md` 中指定步骤的验证字段

## 输入

`$ARGUMENTS`：`[step-N] [auto [--full] | manual]`（可选）

- `step-N` —— 目标步骤（如 `step-2`）；省略则使用 `task-state.md` 中的当前步骤
- `auto` —— 运行 auto 类型条件（默认：快速模式）
- `auto --full` —— 从头运行所有 auto 类型条件
- `manual` —— 向用户展示 manual 类型条件，等待人工确认
- _（全部省略）_ —— 使用当前步骤，提示用户选择 auto 或 manual

## 步骤

### 确定目标步骤

若提供了 `step-N`，使用该步骤。否则从 `task-state.md` 读取 `Current Step`。
若 `Current Step` 为 `—`（未处于实现阶段），提示用户指定步骤，然后停止。

### auto 模式

**快速模式**（默认）：先检查 `task-state.md` —— 若该步骤的 `auto-check` 已为
`passed`，跳过所有条件直接报告通过。否则，若当前 session 已为该步骤运行过
verify-step 或 verify-task 且上下文中有结果，跳过之前通过的条件，仅重新运行失败或
尚未运行的条件。若无先前 session 上下文，退回至完整模式。

**完整模式**（`--full`）：无论先前结果如何，运行该步骤的所有 `(auto)` 条件。

1. 从设计文档中该步骤的 **Auto Verification** 部分读取 `(auto)` 条件。
2. 执行每个条件的命令并记录结果（pass / fail）。
3. 若全部通过：在 `task-state.md` 中更新该步骤的 `auto-check: passed`。
   若有失败：更新 `auto-check: failed`，报告哪些命令失败。

### manual 模式

1. 从设计文档中该步骤的 **Manual Verification** 部分读取 `(manual)` 条件。
2. 向用户逐一展示每个条件并请求确认。
3. 若用户确认全部通过：在 `task-state.md` 中更新该步骤的 `manual-check: passed`。
   若有拒绝：更新 `manual-check: failed`，记录哪些项目失败。
