# Task Mode: {task-name} ({task-type})

当前任务目录。访问此目录下的任何文件时，本文件自动加载，进入任务工作模式。

## 任务文件

- `task-state.md` — 文档列表与任务进展的单一来源（不可拆分）
- 其余文件见 task-state.md 文档索引（需求/设计文档可拆分）

## 可用子命令

以下自然语言指令在任务工作模式下有效：

- **规划需求 / 刷新需求** — 填写或更新需求文档，同步更新 task-state.md 需求阶段状态
- **规划设计 / 刷新设计** — 基于需求生成设计文档（含步骤划分和验收条件），同步更新 task-state.md
- **开始实现 / 实现第 N 步** — 按设计文档 Step N 开始编写代码，更新 task-state.md 当前步骤
- **提交** — 生成规范 commit message，更新 task-state.md 对应步骤为 done，记录 commit hash
- **执行验收 / 验收** — 触发验收检查（等同执行 verify-task）
- **根据上下文更新状态** — AI 根据当前对话内容自动判断并更新 task-state.md
- **更新状态为：{描述}** — 按指定描述更新 task-state.md 对应阶段状态
- **当前状态 / 进展** — 读取 task-state.md，输出摘要
- **查看无关变更** — 识别 git log 中与本任务无关的提交

## Skill 命令

- `/aisk:verify-task` — 执行验收检查（auto / manual / 两者）
- `/aisk:complete-task` — 完成任务（完成度检查 + 清理文档）
