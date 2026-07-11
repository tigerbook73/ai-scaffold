---
name: aisk-quick-ship
description: 判断当前分支和变更状态，自动完成提交、PR 和 squash 合并。
---

# quick-ship

判断当前分支和变更状态，自动完成提交、PR 和 squash 合并。

---

## 约束

- **必须使用 agent/subagent 模式执行判断**：第一步到第四步（判断状态、读取变更、推断意图、评估简单性）放到独立 agent 中完成，避免大量 diff 和 log 污染主上下文
- PR 均使用 squash 合并后删除分支
- 遇到任何错误或合并冲突立即停止；不解决冲突
- 只有一次确认提示（第五步），非简单变更时须用户明确确认风险

## 步骤

### 第零步 — 启动判断 agent

除非用户明确说"不要用 agent"或当前运行环境没有 agent/subagent 能力，否则必须先启动一个独立 agent 执行第一步到第四步。

判断 agent 返回格式：

```text
status: ok | nothing_to_do
on_base_branch: true | false             # true：当前在 main/master 上
base: <base-branch>                      # 目标分支：已有 PR 时取其 base，否则取仓库默认分支
current_branch: <current-branch>         # on_base_branch 为 false 时有效
new_branch: <type>/<slug>                # on_base_branch 为 true 时，为本次改动新建的分支名
has_uncommitted_changes: true | false
has_unpushed_commits: true | false
existing_pr:
  number: <pr-number>
  title: <pr-title>
commit_message: <type(scope): description>
intent_summary: <one-line>
simple: true | false
simple_reasons:
  - <不满足简单性的具体原因，仅当 simple 为 false 时列出>
```

`status` 为 `nothing_to_do` 时，主 agent 直接告知用户无事可做并停止，不进入第五步。

### 第一步 — 判断当前状态

运行 `git branch --show-current`、`git status --porcelain`，确定 `on_base_branch`。

若 `on_base_branch` 为 `false`（已在功能分支上），运行 `gh pr list --head <current-branch> --json number,title,baseRefName` 判断是否已有 PR：

- 有结果 → 记录 `existing_pr.number`、`existing_pr.title`，`base` 取其 `baseRefName`
- 无结果 → `base` 取仓库默认分支（`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`）

若 `on_base_branch` 为 `true`，`base` 即当前分支本身。

判断 `has_uncommitted_changes`（`git status --porcelain` 非空）和 `has_unpushed_commits`：存在 upstream 时看 `git log @{u}..HEAD` 是否非空；分支无 upstream 时视为存在未推送 commit。

若同时满足：无未提交变更、无未推送 commit、且（`on_base_branch` 为 `true`，或 `on_base_branch` 为 `false` 且无 `existing_pr`）——即没有任何新变更、也没有可合并的现有 PR——`status` 记为 `nothing_to_do`。

### 第二步 — 读取变更

运行 `git diff HEAD` 和 `git status` 获取所有变更内容。若无未提交变更且存在 `existing_pr`，从已有 PR 标题和 log 推断意图。

### 第三步 — 推断意图

一句话概括：从 diff、文件名和近期 commit 历史推断改了什么、为何改。

### 第四步 — 评估简单性

满足以下**所有**条件时标记为**简单**：

- 未引入或修改复杂的业务逻辑
- 无新算法、数据转换或非平凡控制流
- 满足以下之一：无需测试（配置、文档、样式、微小措辞），或现有测试已覆盖变更路径

### 第五步 — 确认并执行

主 agent 基于第零步判断 agent 返回的摘要，向用户展示计划：

- **意图**：`intent_summary`
- **当前位置**：`on_base_branch` 为 `true` 时展示"main/master，将新建分支 `<new_branch>`"；否则展示"当前分支 `<current_branch>`"
- **现有 PR**：存在 `existing_pr` 时展示 `#<number>` `<title>`
- **提交**：`commit_message`（无未提交变更时跳过）
- **操作**：完整步骤序列（见下）

若变更**简单**，直接执行，无需确认

若变更**不简单**，在计划前显示警告：

> ⚠️ 变更不满足简单性条件：[`simple_reasons`]。继续将绕过常规审查——请确认你清楚这个决定。

等待用户确认后，按以下统一流程执行：

1. `on_base_branch` 为 `true` 时：`git checkout -b <new_branch>`（之后按新分支作为当前工作分支继续下列步骤）
2. 有未提交变更时：`git add -A && git commit -m "<commit_message>"`
3. 推送：有 upstream 时 `git push`，否则 `git push -u origin <branch>`（`<branch>` 为步骤 1 后的工作分支：`on_base_branch` 为 `true` 时是 `<new_branch>`，否则是 `<current_branch>`）
4. 无 `existing_pr` 时：`gh pr create --title "<commit-subject>" --body "<intent_summary>" --base <base>`，记录 `<pr-number>`
5. `gh pr merge <pr-number> --squash --auto --delete-branch`，随后每 10 秒查询 `gh pr view <pr-number> --json state -q .state`，直到 `MERGED`；超过 10 分钟则停止并报超时
6. `git checkout <base> && git pull`

任一步骤失败时立即停止并报告错误。
