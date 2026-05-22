# Task 管理系统 — 主设计文档

## 一、核心架构

### 分支策略

每个任务独占一个 Git 分支，分支名即任务标识符。

命名规范：

- Feature 类型：`feature/{task-name}`
- Refactoring 类型：`refactor/{task-name}`

`{task-name}` 使用 kebab-case，简洁描述任务内容，例如：`feature/product-search`、`refactor/auth-middleware`。

**约束**：

- create-task 只允许在主干分支（main / master）执行
- 一个分支对应唯一一个任务

---

### 目录结构

任务文档存放在目标项目（被操作的项目，非本 skill 仓库）的以下路径：

```
docs/tasks/
└── {task-name}/
    ├── .claude/
    │   └── CLAUDE.md          ← 任务上下文指令（访问此目录任意文件时自动加载）
    ├── requirements.md        ← 需求文档
    ├── design.md              ← 设计文档（含步骤划分）
    └── task-state.md          ← 文档列表与任务进展的单一来源
```

**路径约定**：

- `docs/tasks/` 为固定根目录，不可配置
- 任务目录名与分支名中的 `{task-name}` 部分完全一致
- 任务文档与代码变更在同一分支，PR 合并时一同处理（但合并前需删除文档）

---

### 文件职责

| 文件              | 作用                                                 | 何时创建              | 何时销毁      |
| ----------------- | ---------------------------------------------------- | --------------------- | ------------- |
| .claude/CLAUDE.md | 任务工作模式指令（子命令列表等），访问目录时自动加载 | create-task           | complete-task |
| requirements.md   | 记录需求、约束、验收标准（可拆分）                   | create-task（仅标题） | complete-task |
| design.md         | 记录实现方案与步骤划分（可拆分）                     | create-task（仅标题） | complete-task |
| task-state.md     | 文档列表与全阶段进展的单一来源，含验收结果（不可拆分） | create-task           | complete-task |

---

## 二、上下文机制

start-task 在当前 session 建立任务上下文，后续自然语言指令默认针对当前任务执行：

1. 在 `docs/tasks/` 下查找含 `task-state.md` 的目录
2. 读取 task-state.md 的文档索引，按需读取索引中列出的 requirements / design 类文档
3. `.claude/CLAUDE.md` 随即自动加载，子命令和工作模式规则进入上下文
4. 上下文仅在当前 session 有效；新 session 开始时需重新执行 start-task（或 resume-task）

**.claude/CLAUDE.md 的优势**：存储在 git 分支内，跨 session 天然有效，无需任何外部状态维护。

> Skill 详细设计见 `design-task-skills.md`
