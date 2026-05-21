# 同步技能

将全局技能库中的所有技能同步到当前项目的 `.claude/commands/aisk/`。

**调用方式**：`/aisk/sync`（无参数）

---

## 步骤

1. 检查 `~/.ai-skills/config.json` 是否存在：
   ```bash
   cat ~/.ai-skills/config.json
   ```
   若不存在，提示用户先在 ai-skills 仓库目录下运行 `npm run register`，然后终止。

2. 从配置读取 `repo` 路径，获取当前项目目录，运行同步脚本：
   ```bash
   npm --prefix {repo} run sync -- --target {cwd}
   ```
   其中 `{repo}` 替换为配置中的实际路径，`{cwd}` 替换为当前工作目录的绝对路径。

3. 输出同步结果（由 sync.ts 打印）。

---

## 说明

- 同步范围由 `{repo}/claude/setting.json` 决定，包含所有技能命令和资源文件
- 命令文件同步到 `.claude/commands/aisk/`，资源文件同步到 `.ai-skills/*/resource/`
- 已存在的文件直接覆盖（取最新版本）
