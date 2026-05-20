# 同步技能

将全局技能库中的所有技能同步到当前项目的 `.claude/commands/`。

**调用方式**：`/sync`（无参数）

---

## 步骤

1. 检查 `~/.ai-skills/config.json` 是否存在：
   ```bash
   cat ~/.ai-skills/config.json
   ```
   - 若不存在，输出提示后终止：
     > `~/.ai-skills/config.json` 不存在。请先在 ai-skills 仓库目录下运行：
     > `node scripts/setup.js`

2. 从配置读取 `repo` 路径，运行同步脚本：
   ```bash
   node {repo}/scripts/sync.js
   ```
   其中 `{repo}` 替换为配置中的实际路径。

3. 输出同步结果（由 sync.js 打印）。

---

## 说明

- 同步范围由 `{repo}/claude/file-tree.json` 决定，包含所有 `category` 下的命令文件
- 已存在的文件会被覆盖（取最新版本）
- 同步不影响当前项目的 `.ai-skills/` 目录（项目自有上下文文件）
