# walkthrough-loop

共享交互循环 — 由 `create-walkthrough2` 和 `start-walkthrough2` 在进入展示阶段时读取。

---

## 前置条件

进入此循环时，以下变量已从调用方获得：

- `{stateKey}` — 当前走读的状态键
- `{repo}` — 本 skill 仓库路径（来自 `~/.ai-skills/config.json`）
- `{cwd}` — 用户项目的工作目录

如当前上下文中尚未加载 index.json，先执行：

```
state read --key {stateKey}
```

从中获取 `currentGroup`、`totalGroups`、`intent`、`groups[]` 等字段。

---

## 展示当前组

读取并输出 `{cwd}/.ai-skills/walkthrough2/{stateKey}/g{currentGroup}.md`（用 Read 工具）。

输出内容后，在末尾紧接前瞻提示（见下）。

---

## 前瞻提示格式

每次输出组内容后，附加一行：

```
---
走读中（G{N}/{totalGroups}）— `wtgroup next` 下一组 · `wtgroup G{N}` 跳转 · `wtgroup list` 列表 · `wtgroup finish` 完成
```

**注意**：不要根据位置猜测是否到达最后一组——用户可能跳跃式阅读。
只有当读取 index.json 后发现**所有** `groups[].done === true` 时，才主动提示进入完成流程。
否则始终展示标准提示行。

---

## 命令识别模型

### 强关键词（出现即表示走读导航意图）

`wtgroup` · `walkthrough group` · `走读组`

强关键词单独出现时，默认动作为 `next`。

### 动作词

| 动作词（中英文均可）          | 意图                 |
| ----------------------------- | -------------------- |
| next / 下一个 / 下一步 / 继续 | 推进到下一组         |
| prev / 上一个 / 返回          | 回到上一组           |
| G{N} / goto N / 第{N}组 / {N} | 跳转到第 N 组        |
| finish / 完成 / 结束          | 完成走读             |
| list / 列表                   | 列出所有组及完成状态 |
| overview / 概览               | 重新展示全局概览     |

### 强触发（强关键词 + 动作词，顺序不限，直接执行）

示例：`wtgroup next` · `next wtgroup` · `走读组 G3` · `wtgroup 完成` · `wtgroup 3`

### 弱触发（无强关键词，仅有动作词）

上下文**无歧义**时执行，有歧义时不执行、先回答问题。

歧义判断标准：消息中包含提问、代码引用、或与走读导航无关的讨论内容 → 视为歧义，不触发命令。

### 歧义处理

先正常回答用户的问题，回答末尾附加：

> 如需导航，说 `wtgroup next` / `wtgroup G{N}` / `wtgroup finish`。

---

## 命令执行

**next**

```
state next --key {stateKey}
```

- 成功 → 输出命令的 stdout（即下一组内容），附加前瞻提示
- exit 1（无下一组文件）→ 进入完成流程

**prev**

```
state prev --key {stateKey}
```

- 成功 → 输出上一组内容，附加前瞻提示
- exit 1（已在第一组）→ 提示"已在第一组"

**goto N**

```
state goto --n {N} --key {stateKey}
```

- 成功 → 输出目标组内容，附加前瞻提示
- exit 1（N 越界）→ 提示有效范围 `1..{totalGroups}`

**list**

直接读取 index.json，输出所有组的标签和 done 状态（不调用 CLI 命令）：

```
G1 [✓] {groups[0].label}
G2 [ ] {groups[1].label}
...
当前：G{currentGroup}
```

**overview**

从 index.json 重建并输出全局概览：

```
变更意图：{intent}

共 {totalGroups} 组：
  G1 {label} — （已完成 / 进行中 / 未开始）
  G2 {label} — ...
  ...
```

**finish**

进入完成流程（见下）。

---

## 完成流程

1. 执行 `state finish --key {stateKey}`（将 status 设为 completed）
2. 若 `index.checkedOut === true`：提示用户运行 `git checkout -`
3. 询问："走读完成，是否删除状态记录？"
   - 是 → `state delete --key {stateKey}`
   - 否 → 保持，告知用户可随时通过 `start-walkthrough2` 恢复
