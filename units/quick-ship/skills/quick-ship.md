# quick-ship

判断当前分支和变更状态，自动完成提交、PR 和 squash 合并。

---

## 约束

- PR 均使用 squash 合并后删除分支
- 遇到任何错误或合并冲突立即停止；不解决冲突
- 只有一次确认提示（第五步），非简单变更时须用户明确确认风险

## 步骤

### 第一步 — 判断工作模式

运行 `git branch --show-current` 和 `git status --porcelain`，确定模式：

**Mode A（在 main/master 分支）**
→ 创建分支 → 提交 → push → 开 PR → merge

**Mode B（在其他分支，无 PR）**
→ 运行 `gh pr list --head <current-branch> --json number,title`，无结果时进入此模式
→ 提交（有未提交变更时）→ push → 开 PR → merge

**Mode C（在其他分支，已有 PR）**
→ 上述命令有结果时进入此模式，记录 `<pr-number>` 和 `<pr-title>`
→ 提交（有未提交变更时）→ push → merge

若当前无未提交变更且无未推送 commit（`git log @{u}..HEAD` 为空），停止并告知用户无事可做。

### 第二步 — 读取变更

运行 `git diff HEAD` 和 `git status` 获取所有变更内容。若 Mode C 且无未提交变更，从已有 PR 标题和 log 推断意图。

### 第三步 — 推断意图

一句话概括：从 diff、文件名和近期 commit 历史推断改了什么、为何改。

### 第四步 — 评估简单性

满足以下**所有**条件时标记为**简单**：

- 未引入或修改复杂的业务逻辑
- 无新算法、数据转换或非平凡控制流
- 满足以下之一：无需测试（配置、文档、样式、微小措辞），或现有测试已覆盖变更路径

若任一条件不满足，**不停止**，在第五步向用户展示明确警告，由用户决定是否继续。

### 第五步 — 确认并执行

向用户展示计划：

- **意图**：第三步一句话摘要
- **模式**：Mode A / B / C（及其含义）
- **Mode A**：新分支 `<type>/<slug>`
- **Mode B/C**：当前分支 `<current-branch>`
- **Mode C**：已有 PR `#<pr-number>` `<pr-title>`
- **提交**：Conventional Commits 格式信息（无未提交变更时跳过）
- **操作**：按模式列出完整步骤序列

若变更**不简单**，在计划前显示警告：

> ⚠️ 变更不满足简单性条件：[具体原因]。继续将绕过常规审查——请确认你清楚这个决定。

等待用户确认后执行：

---

**Mode A**

1. 记录当前分支为 `<base>`
2. `git checkout -b <type>/<slug>`
3. `git add -A && git commit -m "<message>"`
4. `git push -u origin <type>/<slug>`
5. `gh pr create --title "<commit-subject>" --body "<intent-summary>" --base <base>`，记录 `<pr-number>`
6. `gh pr merge <pr-number> --squash --auto --delete-branch`，随后每 10 秒查询 `gh pr view <pr-number> --json state -q .state`，直到 `MERGED`；超过 10 分钟则停止并报超时
7. `git checkout <base> && git pull`

---

**Mode B**

1. 有未提交变更时：`git add -A && git commit -m "<message>"`
2. 有 upstream 时 `git push`，否则 `git push -u origin <current-branch>`
3. `gh pr create --title "<commit-subject>" --body "<intent-summary>"`，记录 `<pr-number>`
4. `gh pr merge <pr-number> --squash --auto --delete-branch`，随后轮询直到 `MERGED`
5. `git checkout main && git pull`

---

**Mode C**

1. 有未提交变更时：`git add -A && git commit -m "<message>"`
2. `git push`
3. `gh pr merge <pr-number> --squash --auto --delete-branch`，随后轮询直到 `MERGED`
4. `git checkout main && git pull`

---

任一步骤失败时立即停止并报告错误。
