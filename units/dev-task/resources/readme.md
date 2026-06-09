# dev-task Skill 组

一组 dev-task 工作流组件，用于管理结构化开发dev-task，具备分支独占工作流、文档脚手架和逐步验收检查功能。

## 工作流模型

每个 dev-task 对应一个分支和一个 PR，工作流强制执行一一对应关系：

- **每次只处理一个 dev-task** —— `docs/dev-tasks/` 下任意时刻只允许存在一个 dev-task 目录。
  新 dev-task 只能在 main/master 分支且工作树干净时创建。
- **流程文档不进 main** —— dev-task 文档（`requirements.md`、`design.md` 等）
  存在于 dev-task 分支上，PR 合并前删除。它们记录的是进行中的思考，
  而非项目的永久知识。
- **关闭前先提炼** —— 删除 dev-task 文档前，将架构决策或重要设计选择提取到项目的永久文档中。
  `complete dev-task` 上下文命令会明确提示此步骤。

## Skill

**`create-dev-task`** — 初始化新 dev-task：创建专属分支（`feature/*` 或 `refactor/*`）、在 `docs/dev-tasks/{name}/` 下创建 `dev-task-state.md`，并提交 dev-task 初始化。只能在 main/master 分支且工作树干净时运行。

## Path Rule

**`dev-task-workflow`** — Claude Code path rule，匹配 `docs/dev-tasks/**/*.md`。处理 dev-task 文档时自动进入 dev-task 工作模式，并通过自然语言上下文命令识别 `plan requirements`、`plan design`、`implement step N`、`verify step`、`verify dev-task`、`complete dev-task` 等操作。

## 典型工作流

```text
# 在 main 分支上，新建一个功能 dev-task
/aisk/create-dev-task feature product-search

# 打开或处理 docs/dev-tasks/product-search/dev-task-state.md 后，path rule 自动建立 dev-task 上下文
plan requirements
plan design

# 实现某个步骤后，运行验收检查
implement step 1
verify step auto
verify step manual

# 一次性验证所有步骤
verify dev-task auto --full

# 所有步骤完成并通过验收后，关闭 dev-task
complete dev-task
```

## dev-task 文档结构

```text
docs/dev-tasks/{dev-task-name}/
├── requirements.md
├── design.md
└── dev-task-state.md       ← 进度的唯一来源
```

## 资源文件

`create-dev-task` 用于搭建 dev-task 文档的模板：

- `resources/dev-task-state.md` — dev-task-state.md 格式模板
- `resources/requirements-feature.md` — feature 类需求文档的必要章节格式规范
- `resources/requirements-refactor.md` — refactor 类需求文档的必要章节格式规范
- `resources/design.md` — 设计步骤文档的必要章节格式规范（Step Type、Auto/Manual Verification）

## 规则文件

- `rules/dev-task-workflow.md` — Claude Code dev-task 工作模式 path rule
