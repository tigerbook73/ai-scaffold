# create-walkthrough

创建新的走读：签出目标版本，一次性分析所有变更，对变更分组，展示全局概览，然后按需逐组走读。

**用法**：`/aisk/create-walkthrough [<range>]`

---

## 约束

- 每个 state key（从当前分支派生）只允许一个活跃走读；若已存在，提示用户选择恢复或覆盖
- 签出前工作树必须干净
- **静默准备**：不作解说地完成所有设置步骤；仅在提问或展示内容时输出文本
- **状态脚本**：读取 `~/.ai-skills/config.json` 获取 `{repo}`。Index 操作通过以下方式执行：
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough/resource/walkthrough-state.ts <cmd> [--options]`
- **组文件**：通过 Write 工具直接写入 `g{N}.md`；通过 Read 工具读取。路径：`{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md`
- **策略**：分组和展示规则见 `{repo}/skills/walkthrough/resource/strategy.md`；在第五步时读取

## 输入

`$ARGUMENTS`：`[<range>]`（可选 —— 若提供，直接作为走读目标范围使用）

通过第二步的引导式选择链收集：

1. **目标**：若有未提交变更 → 仅供确认（含未跟踪文件的未提交变更）；若干净 → 编号选项（最新 commit 或 commit 到当前的范围）
2. **意图**：编号选择 —— `learning`（理解原因）或 `review`（评估风险）
3. **参考资料**：编号选择 —— 跳过或提供文件路径/自由文本

## 步骤

### 第一步 — 解析 state key

读取 `~/.ai-skills/config.json` 获取 `{repo}`。

获取当前分支：`git branch --show-current`。

- 返回分支名 → 清理（将 `/` 替换为 `-`）→ `{stateKey}`
- 返回空字符串（已处于 detached HEAD）→ `git rev-parse HEAD` → `state find --hash <hash>`。若找到活跃记录，使用其 `stateKey`；否则从短 hash 生成 key。

检查已有状态：`state read --key {stateKey}`。

- 找到状态且 `status === "active"` → 询问：恢复还是覆盖？
  - 恢复 → 停止（告知用户运行 `start-walkthrough`）
  - 覆盖 → `state delete --key {stateKey}`，继续
- 找到状态且 `status === "completed"` → 提示："此走读已完成。" 询问：重新开始？
  - 是 → `state delete --key {stateKey}`，继续
  - 否 → 停止

### 第二步 — 收集输入

#### 阶段 1 —— 走读目标

若提供了 `$ARGUMENTS`，跳过检测；直接使用它作为 `{targetRef}` 并在继续前向用户确认。

否则，静默运行 `git status --porcelain` 和 `git ls-files --others --exclude-standard | wc -l`，然后分支：

**工作树有变更**（存在未提交变更或未跟踪文件）：

无选项 —— 只有一个有效目标。展示供确认：

```
Walkthrough target:
  Current working tree — uncommitted changes including untracked (N files)
  Confirm? (Y/n)
```

- 用户确认 → `{target}` = 工作树，`{baseline}` = HEAD，`{targetRef}` = 工作树，无需签出
- 用户拒绝 → 停止

**工作树干净**：

展示编号选项（默认 = 1）：

```
Walkthrough target:
  1. Latest commit (HEAD)  ← default
  2. From a specific commit to current version (enter starting commit)
```

- 用户选择 1 或按 Enter → `{target}` = HEAD，`{baseline}` = HEAD~1，`{targetRef}` = HEAD，需要签出
- 用户选择 2 → 询问："Starting commit (e.g. abc1234 or HEAD~3):" → `{target}` = 当前工作树，`{baseline}` = 给定 commit，`{targetRef}` = 工作树，无需签出

#### 阶段 2 —— 走读意图

展示选项：

```
Walkthrough intent:
  1. learning — understand design rationale; group by concept/feature; actively cite reference materials
  2. review   — assess correctness and risk; group by impact/risk area; cite references on demand
```

等待用户选择 1 或 2。存储为 `{walkIntent}`。

#### 阶段 3 —— 参考资料（可选）

展示选项：

```
Reference materials (optional):
  1. Skip
  2. Provide file paths or free-text description...
```

- 用户选择 1 → 将 `{references}` 设为空
- 用户选择 2 → 请求输入；若提供文件路径，立即读取其内容；存储为 `{references}`

### 第三步 — 签出（若需要）

当 target = 当前工作树时，跳过此步骤。

1. 验证工作树干净：`git status --porcelain`。若非空，停止并提示用户先提交或 stash。
2. 记录 `originalBranch` = 当前分支名（来自 `git branch --show-current`）。
3. `git checkout {targetRef} && git rev-parse HEAD` → 将打印的 hash 记录为 `{targetHash}`。
4. 若 `{targetRef}` 是 commit hash（非分支名）：警告用户：
   > Switched to `{targetRef}` (detached HEAD). Run `git checkout -` to return to the original branch when the walkthrough is done.

未执行签出时：`git rev-parse HEAD` → `{targetHash}`；设置 `checkedOut = false`，`originalBranch` = 当前分支。

### 第四步 — 体量检查

```bash
git diff {baseline} --stat
```

当 target = 当前工作树（第三步未执行签出）时，同时统计未跟踪文件：

```bash
git ls-files --others --exclude-standard | wc -l
```

应用以下阈值时将此数量加到已跟踪文件总数中。

| 条件                      | 操作                                               |
| ------------------------- | -------------------------------------------------- |
| 文件数 ≤ 20 且行数 ≤ 1000 | 静默通过                                           |
| 文件数 > 20 或行数 > 1000 | 报告数字；建议缩小到子目录或更短范围；询问是否继续 |

### 第五步 — 完整读取

**Diff**（一次读取 —— 后续不再按组重新读取文件）：

```bash
git diff {baseline} -U15
```

当 target = 当前工作树（第三步未执行签出）时，同时读取：

```bash
git ls-files --others --exclude-standard    # 未跟踪文件；通过 Read 工具逐个读取
```

当 `baseline = HEAD` 时，还需运行：

```bash
git diff -U15                               # 未暂存变更（staged vs unstaged 细分）
```

**上下文文档**：立即读取 `{repo}/skills/walkthrough/resource/strategy.md`，然后按其"分析策略"章节确定要读取哪些上下文文档及读取顺序。

### 第六步 — 完整分析

若尚未加载，读取 `{repo}/skills/walkthrough/resource/strategy.md`。

利用 diff、上下文文档、`{walkIntent}` 和 `{references}`，生成：

1. **变更意图**：1–3 句话，描述此次变更实现了什么以及为何这样做。
2. **分组**：根据 `{walkIntent}` 应用分组策略。每个组必须包含：标签、文件列表、可选的 `designStep` 引用，以及 done=false。
   - `learning`：按概念或功能模块分组；排序以逐步建立心智模型
   - `review`：按风险或影响区域分组；从最高风险到最低风险排序

**不要**在此处为任何组生成文字说明。所有组文件（G1..GN）均在导航过程中按需生成。

### 第七步 — 写入状态

**index.json** —— 运行 `state init --key {stateKey} --index '<json>'`：

```json
{
  "stateKey": "{stateKey}",
  "originalBranch": "{originalBranch}",
  "target": "{human-readable target description}",
  "baseline": "{baseline}",
  "targetRef": "{targetRef}",
  "targetHash": "{targetHash}",
  "checkedOut": true/false,
  "intent": "{1-3 sentence summary}",
  "walkIntent": "learning|review",
  "references": "{references or empty string}",
  "created": "{YYYY-MM-DD}",
  "totalGroups": N,
  "currentGroup": 1,
  "status": "active",
  "groups": [
    { "label": "...", "files": [...], "done": false },
    ...
  ]
}
```

**组文件** —— 不预先写入任何组文件。所有组文件（G1..GN）均在导航过程中按需生成。

### 第八步 — 展示全局概览

输出：

```
Change intent: {intent}

{N} groups:
  G1 {label} — {one-line description} ({files})
  G2 {label} — {one-line description}
  ...
```

**在此停止。** 本次响应中**不要**输出 G1 内容。等待用户回复。

若用户确认分组（任何肯定回复），继续第九步。
若用户要求调整（合并、拆分、重命名组）：

1. 应用调整。
2. 通过 `state update --key {stateKey} --index '<json>'` 更新 `index.json`。
3. 删除分组已变更的已生成 `g{N}.md` 文件（使用 Bash `rm`），以便首次访问时按更新后的分组重新生成。
4. 重新输出更新后的概览，然后停止并再次等待。

### 第九步 — 进入走读循环

读取 `{repo}/skills/walkthrough/resource/walkthrough-loop.md`。
从"显示当前组"处开始执行其中的指令。
（walkthrough-loop 按需生成并输出 g1.md —— 此处无需重复）
