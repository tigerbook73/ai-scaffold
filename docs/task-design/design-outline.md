# Task 管理系统 — 设计文档结构规划

## 文档结构

```
docs/task-design/
├── requirement.md        ← 需求概述（已完成）
├── design-outline.md     ← 本文件，设计文档结构规划
├── design.md             ← 主设计文档
├── design-templates.md   ← 模板设计
└── design-review.md      ← Review 功能设计
```

---

## 各文档职责

### design.md（主设计文档）

涵盖：
- 核心架构（分支策略、目录结构、文件路径约定）
- 状态管理（memory 结构 schema、task state 字段定义、跨 session 机制）
- 各 Skill 详细设计：create-task / start-task / pause-task / close-task
- 验收机制设计（步骤级验收 vs 任务整体验收的判断逻辑）
- 子命令的识别与映射机制

**若文档过大，可进一步拆分为：**
- `design-arch.md` — 核心架构 + 路径约定
- `design-state.md` — 状态管理（memory schema、task state 结构）
- `design-skills.md` — 各 Skill 详细设计 + 子命令映射

### design-templates.md（模板设计）

涵盖：
- Feature 类型：REQUIREMENTS.md / DESIGN.md / PROGRESS.md 模板
- Refactoring 类型：REQUIREMENTS.md / DESIGN.md / PROGRESS.md 模板
- 提交记录规范（commit message 格式及与 PROGRESS.md 的对应关系）

**若文档过大，可进一步拆分为：**
- `design-templates-feature.md` — Feature 类型模板
- `design-templates-refactoring.md` — Refactoring 类型模板
- `design-commit-spec.md` — 提交规范（独立拆出）

### design-review.md（Review 功能设计）

涵盖：
- Review 流程设计（working tree 模式 / commit range 模式）
- 变更分组策略
- 进度记录 schema（存入 memory 的结构）
- start-review / end-review 详细行为

**当前规模预估较小，暂不需要拆分。**

---

## 拆分原则

- 单个文档超过 **200 行**时考虑拆分
- 拆分边界以**职责独立**为准，避免文档之间频繁互相引用
- 拆分后在 `design-outline.md` 中更新结构
