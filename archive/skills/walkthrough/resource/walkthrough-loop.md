# walkthrough-loop

共享交互循环 —— 由 `create-walkthrough` 和 `start-walkthrough` 在进入展示阶段时加载。

---

## 前置条件

进入此循环时，调用方已提供以下变量：

- `{stateKey}` —— 当前走读状态 key
- `{repo}` —— skill 代码库路径（来自 `~/.ai-skills/config.json`）
- `{cwd}` —— 用户项目的工作目录

若 index.json 尚未在当前上下文中加载，运行：

```
state read --key {stateKey}
```

从中获取 `currentGroup`、`totalGroups`、`intent`、`groups[]` 及其他字段。

---

## 显示当前组

通过 Read 工具读取并输出 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{currentGroup}.md`。

输出内容后，立即追加前瞻提示（见下文）。

---

## 前瞻提示格式

每组内容之后追加一行：

```
---G{N}/{totalGroups} — `wtgroup next` · `wtgroup G{X}` · `wtgroup list` · `wtgroup finish`
```

其中 `{N}` 为当前组编号，`{X}` 为 `{N}+1`（实际的下一组编号，非占位符）。最后一组时省略 `wtgroup next` 和 `wtgroup G{X}`。

**注意**：不要根据位置推测是否已到最后一组 —— 用户可能非顺序阅读。
仅当读取 index.json 显示**所有** `groups[].done === true` 时，才主动进入完成流程。
否则始终显示标准提示行。

---

## 命令识别模型

### 强关键词（表明走读导航意图）

`wtgroup` · `walkthrough group` · `走读组`

单独使用强关键词时，默认执行 `next` 操作。

### 操作词

| 操作词（中英文均可）          | 意图                 |
| ----------------------------- | -------------------- |
| next / 下一个 / 下一步 / 继续 | 前进到下一组         |
| prev / 上一个 / 返回          | 返回上一组           |
| G{N} / goto N / 第{N}组 / {N} | 跳转到第 N 组        |
| finish / 完成 / 结束          | 结束走读             |
| list / 列表                   | 列出所有组及完成状态 |
| overview / 概览               | 重新显示全局概览     |

### 强触发（强关键词 + 操作词，顺序任意 —— 立即执行）

示例：`wtgroup next` · `next wtgroup` · `走读组 G3` · `wtgroup finish` · `wtgroup 3`

### 弱触发（仅操作词，无强关键词）

仅当上下文**明确无歧义**时执行；否则先回答问题。

歧义判断标准：消息含有问题、代码引用或与走读导航无关的讨论 → 视为有歧义，不触发。

### 歧义处理

正常回答用户的问题，然后在结尾追加：

> 若需导航，输入 `wtgroup next` / `wtgroup G{N}` / `wtgroup finish`。

---

## 按需组生成

所有组均惰性生成 —— 不预先写入任何组文件；每个 G{N} 在首次访问时创建。

显示任何组 G{N} 前，检查 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md` 是否存在（尝试读取）。若不存在，执行以下生成流程，然后通过 Write 工具写入结果。

**G{N} 的生成流程：**

1. 从 index.json 中读取 `groups[N-1].files`。
2. 运行 `git diff {baseline} -U15 -- {files...}` 获取仅针对本组文件的 diff。
3. 对每个包含变更文件的目录，检查是否存在 `README.md`、`types.ts` 或 `index.ts`；读取存在且与理解模块边界相关的文件。
4. 若尚未加载，读取 `{repo}/skills/walkthrough/resource/strategy.md`。
5. 按照 `strategy.md` 中的展示格式，生成 G{N} 的完整走读内容。
6. 通过 Write 工具将结果写入 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md` —— **静默写入，不作解说**。

写入后，生成的内容已在上下文中 —— **不要重新读取文件**。直接输出内容并追加前瞻提示。

## 命令执行

**next**

1. 确定 `nextN = currentGroup + 1`。
2. 若 `nextN > totalGroups` → 进入完成流程。
3. 运行 `state next --key {stateKey}`。
4. 若 `g{nextN}.md` 不存在 → 执行 G{nextN} 的按需生成流程；生成流程直接输出内容 —— 跳过第 5 步。
5. （文件已存在）读取 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{nextN}.md` 并输出，然后追加前瞻提示。

**prev**

1. 运行 `state prev --key {stateKey}`。
   - 退出码 1 → 提示"已在第一组"
2. 从更新后的 index 确定新的 `currentGroup`（若需要则重新读取，或以旧 currentGroup − 1 推算）。
3. 读取 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{currentGroup}.md` 并输出，然后追加前瞻提示。

**goto N**

1. 运行 `state goto --n {N} --key {stateKey}`。
   - 退出码 1（N 超出范围）→ 报告有效范围 `1..{totalGroups}`
2. 若 `g{N}.md` 不存在 → 执行 G{N} 的按需生成流程；生成流程直接输出内容 —— 跳过第 3 步。
3. （文件已存在）读取 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md` 并输出，然后追加前瞻提示。

**list**

直接读取 index.json 并输出所有组标签和完成状态（不调用 CLI）：

```
G1 [✓] {groups[0].label}
G2 [ ] {groups[1].label}
...
Current: G{currentGroup}
```

**overview**

从 index.json 重建并输出全局概览：

```
Change intent: {intent}

{totalGroups} groups:
  G1 {label} — (done / in progress / not started)
  G2 {label} — ...
  ...
```

**finish**

进入完成流程（见下文）。

---

## 完成流程

1. 运行 `state finish --key {stateKey}`（将状态设为 completed）
2. 若 `index.checkedOut === true`：提示用户运行 `git checkout -`
3. 询问："走读完成。删除状态记录？"
   - 是 → `state delete --key {stateKey}`
   - 否 → 保留；告知用户可随时通过 `start-walkthrough` 恢复
