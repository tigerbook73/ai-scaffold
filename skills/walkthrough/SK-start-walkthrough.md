# start-walkthrough

从状态文件恢复走读。

---

## 约束

- 必须存在活跃（未完成）的状态记录；若未找到或已完成，提示用户先运行 `create-walkthrough`
- 上下文作用范围为当前 session；每次新 session 开始时重新运行以恢复走读状态
- **静默准备**：读取和验证状态时不作解说；仅在输出警告或恢复摘要时才输出文本
- **状态脚本**：读取 `~/.ai-skills/config.json` 获取 `{repo}`。Index 操作通过以下方式执行：
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough/resource/walkthrough-state.ts <cmd> [--options]`
- **组文件**：通过 Read 工具直接读取 `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md`

## 步骤

### 第一步 — 定位状态

读取 `~/.ai-skills/config.json` 获取 `{repo}`。

确定 state key：

- `git branch --show-current` 返回分支名 → 清理（将 `/` 替换为 `-`）→ `{stateKey}` → `state read --key {stateKey}`
- 返回空（detached HEAD）→ `git rev-parse HEAD` → `state find --hash <hash>` → 从结果提取 `stateKey` → `state read --key {stateKey}`

若未找到状态（退出码 1）→ 告知用户先运行 `create-walkthrough`，停止。

若找到状态且 `index.status === "completed"` → 警告：

> This walkthrough is already completed (`{index.target}`). Run `create-walkthrough` to start a new one.
> Stop.

### 第二步 — 验证签出位置

若 `index.checkedOut = true`：

1. `git rev-parse HEAD` → `{currentHash}`
2. 与 `index.targetHash` 对比。
3. 不匹配 → 警告并停止：
   > Current position (`{currentHash}`) does not match the walkthrough target (`{index.targetHash}`).
   > Run `git checkout {index.targetRef}` first, then re-run `start-walkthrough`.

### 第三步 — 恢复摘要

输出：

```
Walkthrough target: {index.target} (baseline: {index.baseline})
Progress: G{index.currentGroup} / {index.totalGroups}, {done count} group(s) done
```

### 第四步 — 进入走读循环

读取 `{repo}/skills/walkthrough/resource/walkthrough-loop.md`。
从"显示当前组"处开始执行其中的指令。
（walkthrough-loop 会自行读取并输出 g{currentGroup}.md —— 此处无需重复）
