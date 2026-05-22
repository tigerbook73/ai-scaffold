# Task Mode: {task-name} ({task-type})

当前任务目录。访问此目录下的任何文件时，本文件自动加载，进入任务工作模式——自然语言指令默认针对本任务执行。

**若当前 session 尚未建立任务上下文**：在响应任何指令前，先读取 `task-state.md` 及其文档索引中列出的所有文档，输出任务摘要（当前阶段、关键进展、待处理事项）。

## 任务文件

- `task-state.md` — 文档列表与任务进展的单一来源（不可拆分）
- 其余文件见 task-state.md 文档索引（需求/设计文档可拆分）

## 可用子命令

以下自然语言指令在任务工作模式下有效：

- **规划需求 / 刷新需求** — 填写或更新需求文档，同步更新 task-state.md 需求阶段状态
- **规划设计 / 刷新设计** — 基于需求生成设计文档（含步骤划分和验收条件），同步更新 task-state.md
- **开始实现 / 实现第 N 步** — 按设计文档 Step N 开始编写代码，更新 task-state.md 当前步骤
- **提交** — 生成规范 commit message，更新 task-state.md 对应步骤为 done，记录 commit hash
  - Step 提交格式：`{type}(step-N): {step-title}`（type 与分支类型一致：feat / refactor）
  - 非 Step 提交（顺手修复、文档更新等）：标准 conventional commits，不带 step scope
- **执行验收 / 验收** — 执行验收检查步骤（auto 条件直接运行，manual 条件逐项向用户确认），结果写入 task-state.md；也可提示用户运行 `/aisk:verify-task`
- **根据上下文更新状态** — AI 根据当前对话内容自动判断并更新 task-state.md
- **更新状态为：{描述}** — 按指定描述更新 task-state.md 对应阶段状态
- **当前状态 / 进展** — 读取 task-state.md，输出摘要
- **查看无关变更** — 识别 git log 中与本任务无关的提交

## Skill 命令

- `/aisk:verify-step [step-N] [auto [--full] | manual]` — 单步验收（默认当前步骤）
- `/aisk:verify-task [auto [--full] | manual]` — 全量验收（所有步骤）
- `/aisk:complete-task` — 完成任务（完成度检查 + 清理文档）
