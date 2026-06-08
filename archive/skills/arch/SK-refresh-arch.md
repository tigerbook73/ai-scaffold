# refresh-arch

扫描代码库，生成或刷新 `.ai-skills/architecture.md`，记录代码变更期间不应被破坏的架构决策。

---

## 约束

- [写操作] 仅写入 `.ai-skills/architecture.md`；不修改其他文件
- 写入前先展示 diff；仅在用户确认后才写入

## 输入

`$ARGUMENTS`（可选）

- 无参数 → 自动检测：若工作树有变更（staged/unstaged/untracked）→ 等同 `changes`；否则 → 等同 `commit 1`
- `help` → 列出所有可用模式，然后停止
- `ALL` → 完整项目文件树（智能忽略自动生成代码）
- `changes` → 所有工作树变更：`git diff`（未暂存）+ `git diff --cached`（已暂存）+ 未跟踪新文件（`git ls-files --others --exclude-standard`）
- `commit [N|hash]` → 该点到当前工作树之间发生变更的文件：
  - `commit` 或 `commit 1` → HEAD~1 到当前（`git diff HEAD~1`）
  - `commit N` → HEAD~N 到当前（`git diff HEAD~N`）
  - `commit <hash>` → `<hash>` 到当前（`git diff <hash>`）
- `<path>` → 该目录/文件下文件的当前内容

## 步骤

1. 读取当前 `.ai-skills/architecture.md`（若存在）

2. 解析 `$ARGUMENTS` 并确定审查范围；获取对应文件或 diff 内容

3. 扫描获取的内容，按以下标准提取或刷新架构决策条目：

   每条条目必须同时满足：
   1. 这是一个可违反的选择 —— 有明确的"不该做什么"
   2. 违反时没有即时信号 —— 工具不会报告，行为表现正常；
      影响可能仅在其他模块中显现、延迟暴露，
      或悄悄积累为质量隐患
   3. 理解"为何这样设计"需要阅读多个文件

   每条条目格式：

   ```
   **[Decision title]**
   Counter-example: what not to do (one sentence)
   Rationale: why it was designed this way
   Consequence: what happens if violated
   ```

   不包含：
   - 技术栈的标准用法
   - 无明确反例的描述性内容（"系统使用 X"不构成决策）

   刷新时：
   - 不重复已有条目涵盖的决策；若两条条目从不同角度覆盖同一决策，保留已有条目
   - 新条目必须明确满足以上三个标准；有疑问时不添加 —— 宁少勿多
   - 删除不再满足标准或其对应设计已变更的已有条目

4. 展示 diff；等待用户确认

5. 用户确认后，写入 `.ai-skills/architecture.md`（若目录不存在则创建）

   若 `.ai-skills/` 是首次创建，提醒用户将 `.ai-skills/` 添加到 `.gitignore`。

   输出一行范围摘要，例如：

   ```
   Scope: changes (2 modified, 1 staged, 1 untracked) | Entries added: 2, updated: 1, removed: 0
   Scope: commit HEAD~1 (abc1234), 3 files | Entries added: 0, updated: 1, removed: 0
   Scope: ALL, 12 files | Entries added: 4, updated: 0, removed: 0
   ```
