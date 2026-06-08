# task Skill 组

一组 skill，用于管理结构化开发任务，具备分支独占工作流、文档脚手架和逐步验收检查功能。

## 工作流模型

每个任务对应一个分支和一个 PR，工作流强制执行一一对应关系：

- **每次只处理一个任务** —— `docs/tasks/` 下任意时刻只允许存在一个任务目录。
  新任务只能在 main/master 分支且工作树干净时创建。
- **流程文档不进 main** —— 任务文档（`requirements.md`、`design.md` 等）
  存在于任务分支上，PR 合并前删除。它们记录的是进行中的思考，
  而非项目的永久知识。
- **关闭前先提炼** —— 删除任务文档前，将架构决策或重要设计选择提取到项目的永久文档中。
  `complete-task` 会明确提示此步骤。

## Skills

**`create-task`** — 初始化新任务：创建专属分支（`feature/*` 或 `refactor/*`）、在 `docs/tasks/{name}/` 下搭建任务文档，并进入任务工作模式。只能在 main/master 分支且工作树干净时运行。

**`start-task`** — 为当前 session 恢复任务上下文。读取 `task-state.md` 及 Document Index 中列出的所有文档，然后输出任务摘要。每次新 session 开始时重新运行。

**`verify-step`** — 对单个步骤运行验收检查（默认为当前步骤）。支持 `auto`（执行 shell 命令）和 `manual`（人工确认）两种模式，以及快速（fast）和完整（full）两种变体。

**`verify-task`** — 依据设计文档中的 Task Acceptance 条件，对整个任务运行验收检查。支持 `auto` 和 `manual` 两种模式。

**`complete-task`** — 验证所有步骤和任务级验收均已完成，然后（经用户确认后）删除任务目录并提交清理内容。提示用户创建 PR。

## 典型工作流

```
# 在 main 分支上，新建一个功能任务
/aisk/create-task feature product-search

# 在新 session 中，恢复任务上下文
/aisk/start-task

# 实现某个步骤后，运行验收检查
/aisk/verify-step auto
/aisk/verify-step manual

# 一次性验证所有步骤
/aisk/verify-task auto --full

# 所有步骤完成并通过验收后，关闭任务
/aisk/complete-task
```

## 任务文档结构

```
docs/tasks/{task-name}/
├── .claude/
│   └── CLAUDE.md       ← 访问此目录下任意文件时，由 Claude Code 自动加载
├── AGENTS.md           ← 在此目录中工作时，由 Codex 自动加载
├── requirements.md
├── design.md
└── task-state.md       ← 进度的唯一来源
```

## 资源文件

`create-task` 用于搭建任务文档的模板：

- `resources/task-context.md` — 任务工作模式上下文模板（同时安装为 CLAUDE.md 和 AGENTS.md）
- `resources/task-state.md` — task-state.md 格式模板
- `resources/requirements-feature.md` — feature 类需求文档的必要章节格式规范
- `resources/requirements-refactor.md` — refactor 类需求文档的必要章节格式规范
- `resources/design.md` — 设计步骤文档的必要章节格式规范（Step Type、Auto/Manual Verification）
