# complete-task

验证任务完成情况，清理任务文档，并提示用户创建 PR。

不运行验收测试 —— 请使用 verify-task 执行验收测试。

---

## 约束

- 必须处于任务工作模式（当前 session 已执行 start-task）
- 工作树必须干净（无未提交变更，无未跟踪文件）
- 必须处于任务分支（非 main/master）
- [写操作] 第二阶段删除 `docs/tasks/{task-name}/` 并创建 git commit —— 每项操作均需用户明确确认

## 步骤

### 第一阶段 — 完整性检查

1. 运行 `git status`。若工作树不干净（存在 staged、modified 或 untracked 文件），
   停止并提示用户先提交或 stash 变更。
2. 对 `task-state.md` Implementation Phase 中的每个步骤，验证：
   - 状态为 `done`
   - 已记录 commit hash（不为 `—`）
3. 验证 `task-state.md` 中每个步骤的 `auto-check` 字段均为 `passed`。
4. 验证 `task-state.md` 中每个步骤的 `manual-check` 字段均为 `passed`。
5. 验证 `task-state.md` 中 Task Acceptance 的 `auto-check` 字段为 `passed`。
6. 验证 `task-state.md` 中 Task Acceptance 的 `manual-check` 字段为 `passed`。
7. 若任何检查失败，列出所有失败项并停止。提示用户解决（如运行 verify-step / verify-task、补全缺失步骤或提交待提交变更）。

### 第二阶段 — 清理

此阶段每项操作均需用户明确确认后才执行。

7. 询问用户："Have you distilled any decisions or architecture changes from this task into
   the project's permanent documentation?" 接受 yes/no/skip —— 任何回答均可继续；这是提醒，不是门控。

8. 展示待删除任务目录的完整路径（`docs/tasks/{task-name}/`）。
   请用户确认删除。
9. 确认后：
   - 删除整个 `docs/tasks/{task-name}/` 目录（含所有文件和子目录）。
   - 暂存：`git add -A docs/tasks/{task-name}/`。
   - 提交：`git commit -m "chore: complete task {task-name}"`。
10. 提示用户创建 PR。不自动创建。

> **恢复**：若 PR 审查后需要变更，可通过以下命令恢复已删除文档：
> `git checkout <commit-before-deletion> -- docs/tasks/{task-name}/`
