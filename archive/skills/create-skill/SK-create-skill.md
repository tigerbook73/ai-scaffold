# create-skill

捕获 skill 意图，将其精炼为规范，并添加到全局代码库。

**用法**：`/aisk/create-skill [$ARGUMENTS]`

---

## 约束

- 写入 `{repo}/skills/{name}/SK-{name}.md`
- 触发 `pnpm build`，同步 `.claude/rules/skill-rules.md`

## 输入

- 无参数 → 提示用户描述他们想要的 skill
- 任何参数 → 将整个参数视为原始 skill 意图

## 步骤

### 第一步 — 收集意图

读取 `~/.ai-skills/config.json` 获取 `{repo}`。若不存在，告知用户先运行 `pnpm register`，然后停止。

读取 `{repo}/skills/skill-format.md` 了解格式规范。

若提供了参数，将其作为原始意图。否则询问用户：

> 这个 skill 应该做什么？请描述目标、触发时机和预期行为。

### 第二步 — 整理并确认意图

以结构化形式重新陈述意图：

- **目标**：skill 实现了什么
- **触发时机**：何时以及如何使用
- **核心行为**：高层次的关键步骤
- **约束**：写入范围、副作用、限制
- **范围外**：本 skill 明确不做的事

请用户确认或更正后再继续。

### 第三步 — 生成 skill 草稿

基于已确认的意图：

1. 根据格式规范选择 Compact 或 Structured 等级
2. 推断一个 kebab-case skill 名称
3. 按所选模板生成完整的 skill MD 内容（使用模板对应的语言）

向用户展示生成内容并等待确认。若用户要求修改，应用修改后重新展示，再继续。

### 第四步 — 写入代码库

用户确认内容后：

1. 将文件写入 `{repo}/skills/{name}/SK-{name}.md`（若 `{name}/` 目录不存在则创建）
2. 若 skill 仅适用于 Claude Code（不支持 Codex），在文件开头添加：
   ```
   ---
   targets: [claude]
   ---
   ```
   否则无需操作 —— skill 默认支持两个目标。
3. 运行：
   ```bash
   pnpm --dir {repo} build
   ```

输出确认信息，并提示用户：

- 在 ai-skills 代码库中运行 `git commit` 以持久化变更
- 运行 `pnpm register` 以全局应用（Claude Code + Codex）

---

## 注意事项

- 所有生成的SKILL，必须和本文件使用的语言一致
- 默认目标为 Claude Code 和 Codex 两者；仅当 skill 使用 Codex 无法支持的 Claude 专属行为时，才询问用户
