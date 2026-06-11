# quick-ship

审查当前工作区变更，推断意图，若变更简单 —— 创建私有分支、提交、开 PR、squash 合并、返回原分支并 pull。

---

## 约束

- 创建 `<type>/<slug>` 分支（type 来自 Conventional Commits：feat/fix/docs/chore/refactor/style/test），提交所有变更，通过 `gh` 开 PR 并合并
- 只有一次确认提示，在执行 git 操作前（第四步）
- 遇到任何错误或合并冲突立即停止；不解决冲突

## 步骤

### 第一步 — 读取变更

运行 `git diff HEAD` 和 `git status` 以获取所有 staged 和 unstaged 变更。

### 第二步 — 推断意图

用一句话概括变更：从 diff、文件名和近期 commit 历史中推断出改了什么、为何改。

### 第三步 — 评估简单性

满足以下**所有**条件时，将变更标记为**简单**：

- 未引入或修改复杂的业务逻辑
- 无新算法、数据转换或非平凡控制流
- 满足以下之一：无需测试（配置、文档、样式、微小措辞），或现有测试已覆盖变更路径

若任一条件不满足，停止并说明哪个条件未满足。告知用户变更过于复杂，不适合 `quick-ship`，需要手动处理。

### 第四步 — 确认并执行

向用户展示：

- **意图**：第二步的一句话摘要
- **分支**：`<type>/<slug>`，其中 `<type>` 是从变更推断的 Conventional Commits 类型（feat/fix/docs/chore/refactor/style/test），`<slug>` 是从意图提取的简短 kebab-case 标识符
- **提交**：Conventional Commits 格式的提交信息
- **标题**：提交信息的主题行（原文，不改写）
- **操作**：创建分支 → 提交 → push → 创建 PR → squash 合并 → checkout 原分支 → pull

等待确认。获批后按顺序执行：

1. 记录当前分支名为 `<original>`
2. `git checkout -b <type>/<slug>`
3. `git add -A && git commit -m "<message>"`
4. `git push -u origin <type>/<slug>`
5. `gh pr create --title "<commit-subject>" --body "<intent summary>" --base <original>`
6. `gh pr merge --squash --auto --delete-branch`，随后立即执行 `gh pr view --json state -q .state`：
   - 结果为 `MERGED`：直接进入第 7 步
   - 结果为 `OPEN`：每隔 10 秒重复查询，直到 `MERGED`；超过 2 分钟仍未合并则停止并报告超时
7. `git checkout <original>`
8. `git pull`

任一步骤失败时立即停止并报告错误。
