# Task State: {task-name}

## 元信息

- 类型: feature | refactor
- 状态: in_progress | completed

## 文档索引

- `requirements.md` — 需求文档
- `design.md` — 设计文档（含步骤划分）
- （拆分后在此更新，拆分规则见需求文档）

## 当前阶段

{阶段名}（{进行中 | 已完成}）

## 需求阶段

- 状态: done | in_progress | pending
- 记录:
  - [由 AI 根据对话上下文自动组织，如 "需求初稿完成" / "待确认非功能需求" 等]

## 设计阶段

- 状态: done | in_progress | pending
- 记录:
  - [由 AI 根据对话上下文自动组织，如 "整体架构确认" / "待完成 Step 3 设计" 等]

## 实现阶段

- 状态: done | in_progress | pending

### Step 1: {步骤标题}

- 状态: done | in_progress | pending
- Commit: {hash} | —
- 验收:
  - [x] (auto) `npm test` 通过
  - [x] (manual) 浏览器验证 X 功能正常

### Step 2: {步骤标题}

- 状态: pending
- Commit: —
- 验收:
  - [ ] (auto) `npm test` 通过
  - [ ] (manual) 功能验证

## 历史记录

- {date}: 任务创建
- {date}: 需求阶段完成
- {date}: Step 1 完成（{commit-hash}）
