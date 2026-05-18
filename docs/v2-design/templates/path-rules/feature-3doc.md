---
priority: high
paths: ["docs/features/**"]
last_updated: YYYY-MM-DD
---

# Feature 三文档工作流

## 分支约束
- 所有改动必须在 feature branch 上（命名：feature/{name}）
- 禁止将此 branch 合并到主干
- 本规则文件在合并前必须删除

## 文档创建顺序
- plan-feature 执行时只创建 REQUIREMENTS.md 和 PROGRESS.md
- DESIGN.md 在用户明确指令后生成

## 必填标题

### REQUIREMENTS.md
- `status`（frontmatter，draft | confirmed）
- 问题描述
- 用例 / 验收标准

### DESIGN.md
- 方案概述
- 实施步骤（编号，含完成标准）
- 遗留决策

### PROGRESS.md
- 当前阶段（requirements-drafting | design-drafting | implementing | completed）
- 步骤状态（与 DESIGN 实施步骤对应的 checklist）
- 偏差记录

## 实施规则
- DESIGN 实施步骤可按编号逐步执行
- 每步完成并经用户确认后，自动更新 PROGRESS checklist 并提交（代码 + 状态一起）
- 实施后发现问题：只更新 PROGRESS 偏差记录
- 重大变更（影响验收标准）：需更新 REQUIREMENTS / DESIGN 并重置相关步骤状态

## 状态查询
先读 PROGRESS.md 当前阶段，再通过 git log 确认最近提交
