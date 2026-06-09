# dev-task

## 干什么的

`dev-task` 用于管理结构化 dev-task。它可以初始化 dev-task 分支和 `docs/dev-tasks/{name}/` 下的 dev-task 状态文档，并通过 path rule 让后续处理 dev-task 文档时自动进入 dev-task 工作流上下文。

该单元适合较大的 feature 或 refactor，需要先整理需求、设计和实现状态的 dev-task。

它提供的是一组 dev-task 工作流组件：分支独占工作流、dev-task 文档脚手架、逐步实现、自动/人工验收检查，以及 dev-task 完成前的文档收尾提示。

## 工作流模型

每个 dev-task 对应一个分支和一个 PR，工作流强制执行一一对应关系：

- 每次只处理一个 dev-task：`docs/dev-tasks/` 下任意时刻只允许存在一个 dev-task 目录。
- 新 dev-task 只能在 `main` 或 `master` 分支、且工作树干净时创建。
- 流程文档不进 `main`：`requirements.md`、`design.md`、`dev-task-state.md` 等 dev-task 文档只存在于 dev-task 分支上，PR 合并前应删除。
- 关闭前先提炼：删除 dev-task 文档前，将架构决策或重要设计选择提取到项目永久文档中。

## 怎么用

1. 确保当前位于 `main` 或 `master` 分支。
2. 确保工作树干净，且 `docs/dev-tasks/` 下没有已有 dev-task 目录。
3. 请求 agent 创建 dev-task，例如：`create-dev-task feature user-profile-page` 或自然语言说明要创建 feature/refactor dev-task。
4. agent 会创建并切换到 `feature/{name}` 或 `refactor/{name}` 分支。
5. agent 会创建 `docs/dev-tasks/{name}/dev-task-state.md`，提交初始化 commit，并提示开始需求规划。
6. 后续编辑 `docs/dev-tasks/{name}/` 下的 Markdown 文件时，`dev-task-workflow` 规则会提供 dev-task 上下文。

典型流程：

```text
create-dev-task feature product-search

plan requirements
plan design

implement step 1
verify step auto
verify step manual

verify dev-task auto --full
complete dev-task
```

## dev-task 文档结构

```text
docs/dev-tasks/{dev-task-name}/
├── requirements.md
├── design.md
└── dev-task-state.md
```

`dev-task-state.md` 是 dev-task 进度的唯一来源。需求、设计、实现步骤和验收状态都应围绕它维护。

## 组件

- Unit：`dev-task`
- Skill：`skills/create-dev-task.md`
- Rule：`rules/dev-task-workflow.md`
- Resources：
  - `resources/dev-task-state.md`
  - `resources/requirements-feature.md`
  - `resources/requirements-refactor.md`
  - `resources/design.md`
  - `resources/readme.md`

## 注意事项

- `dev-task-type` 只支持 `feature` 和 `refactor`。
- 初始化会创建 git 分支并提交一个 commit。
- 前置条件不满足时会中止，不会继续写入 dev-task 文件。
- `complete dev-task` 上下文命令会提示在删除 dev-task 文档前提炼永久项目知识。
