# bootstrap

初始化 AI Scaffold skill 管理器，完成后即可通过 `/aisk/skills` 命令按需安装各 skill。

**触发方式**

方式 A：提供 raw URL（AI 自行 fetch）
> 请执行 https://raw.githubusercontent.com/{owner}/{repo}/main/bootstrap.md
- 必须使用 raw URL，blob URL 返回 HTML 无法读取

方式 B：直接粘贴文件内容
> 以下是 bootstrap.md 的内容，请按指令执行：[粘贴内容]

**约束**
- [写操作] 必须同时完成以下两项，缺一不可：
  - `.claude/commands/aisk/skills.md` — skill 管理器命令文件
  - `.ai-skills/config.json` — 注册表地址（后续所有 skill 操作依赖此文件）

**步骤**
1. 确定 `AISK_REGISTRY`：
   - 方式 A：从 fetch URL 中去掉 `/bootstrap.md` 得到 raw base URL
   - 方式 B：询问用户仓库的 raw base URL
2. 从 `{AISK_REGISTRY}/registry.json` fetch 注册表，验证须含 `version`、`skills`、`sets` 字段；失败则终止并报告 URL 和错误信息
3. 创建目录（若不存在）：
   - `.claude/commands/aisk/`
   - `.ai-skills/skills/`
4. 下载 `{AISK_REGISTRY}/skills/skills/skills.md` 到 `.claude/commands/aisk/skills.md`
5. **[必须执行]** 将 `AISK_REGISTRY` 写入 `.ai-skills/config.json`（`{"AISK_REGISTRY": "<url>"}` 格式，已存在则合并更新）
6. 输出初始化摘要：已创建的目录和文件、`AISK_REGISTRY` 值，确认两处均已写入，提示通过 `/aisk/skills list` 查看可用 skill
