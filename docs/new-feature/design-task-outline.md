# Task 管理系统 — 设计文档结构规划

## 文档结构

```
docs/new-feature/
├── requirement-task.md        ← 需求（已完成）
├── design-task-outline.md     ← 本文件，设计文档结构规划
├── design-task-core.md        ← 核心架构 + 上下文机制
├── design-task-skills.md      ← Skill 详细设计 + 验收机制 + 子命令映射
└── design-templates.md        ← 模板设计（待编写）
```

---

## 各文档职责

### design-task-core.md（核心架构 + 上下文机制）

涵盖：

- 核心架构（分支策略、目录结构、文件路径约定、文件职责）
- 上下文机制（start-task 如何建立 session 上下文，.claude/CLAUDE.md 加载机制）

### design-task-skills.md（Skill 详细设计）

涵盖：

- 各 Skill 详细设计：create-task / start-task / resume-task / verify-task / complete-task
- 验收机制设计（步骤格式、task-state.md 全阶段格式、步骤级 vs 整体验收）
- 自然语言子命令的识别与映射机制、commit message 规范

### design-templates.md（模板设计）

涵盖：

- Feature 类型：requirements.md / design.md / task-state.md 模板
- Refactoring 类型：requirements.md / design.md / task-state.md 模板
- 提交记录规范（commit message 格式及与 task-state.md 的对应关系）

**若文档过大，可进一步拆分为：**

- `design-templates-feature.md` — Feature 类型模板
- `design-templates-refactoring.md` — Refactoring 类型模板
- `design-commit-spec.md` — 提交规范（独立拆出）

---

## 拆分原则

- 单个文档超过 **200 行**时考虑拆分
- 拆分边界以**职责独立**为准，避免文档之间频繁互相引用
- 拆分后在 `design-task-outline.md` 中更新结构
