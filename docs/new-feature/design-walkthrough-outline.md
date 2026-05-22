# 走读（Walkthrough）功能 — 设计文档结构规划

## 文档结构

```
docs/new-feature/
├── requirement-walkthrough.md     ← 需求（已完成）
├── design-walkthrough-outline.md  ← 本文件，设计文档结构规划
└── design-walkthrough.md          ← Walkthrough 功能设计
```

---

## 各文档职责

### design-walkthrough.md（主设计文档）

涵盖：
- 走读流程设计（未提交变更模式 / commit range 模式 / 全量代码模式）
- 分组策略（有设计文档时按步骤分组 vs 无设计文档时 AI 自动分组）
- 状态文件 schema（存储路径、字段定义、分支索引结构）
- 各 Skill 详细设计：create-walkthrough / start-walkthrough / resume-walkthrough
- session 内恢复 vs 跨 session 恢复的判断逻辑
- 状态失效自检机制

**当前规模预估较小，暂不需要拆分。**

---

## 拆分原则

- 单个文档超过 **200 行**时考虑拆分
- 拆分边界以**职责独立**为准，避免文档之间频繁互相引用
- 拆分后在 `design-walkthrough-outline.md` 中更新结构
