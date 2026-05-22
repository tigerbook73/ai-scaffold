# Task 管理系统 — 设计文档总览

> **维护规则**：任何文件新增、删除或重命名时，必须同步更新本文档。

## 设计文档

| 文件 | 说明 |
| ---- | ---- |
| `design-task-outline.md` | 本文件，设计文档总览 |
| `design-task-core.md` | 核心架构（分支策略、目录结构、文件职责）+ 上下文机制 + Skill 总览 |
| `design-task-skills/create-task.md` | create-task skill 定义 |
| `design-task-skills/start-task.md` | start-task skill 定义（resume-task 为其别名） |
| `design-task-skills/verify-task.md` | verify-task skill 定义（全量，覆盖所有 step） |
| `design-task-skills/verify-step.md` | verify-step skill 定义（单步，默认当前 step） |
| `design-task-skills/complete-task.md` | complete-task skill 定义 |

## 资源模板

| 文件 | 说明 |
| ---- | ---- |
| `design-task-template/CLAUDE.md` | 任务目录 `.claude/CLAUDE.md` 模板（含占位符） |
| `design-task-template/task-state.md` | task-state.md 完整格式模板 |
| `design-task-template/design.md` | design.md 步骤格式模板 |
| `design-task-template/requirements-feature.md` | Feature 任务需求文档模板 |
| `design-task-template/requirements-refactor.md` | Refactor 任务需求文档模板 |
