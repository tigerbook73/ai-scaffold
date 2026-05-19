# skill

管理 AI Scaffold skill：列出、安装、删除。

**调用方式**：`/aisk/skills <subcommand>`

**子命令**（`$ARGUMENTS`）
- `list` → 列出远程所有可用 skill 和 skill-set
- `installed` → 列出本地已安装 skill
- `install <name>` → 安装 skill 或 skill-set
- `remove <name>` → 删除 skill 或 skill-set

---

## list

1. 读取 `.ai-skills/config.json`，获取 `AISK_REGISTRY`；不存在则提示先运行 bootstrap 并终止
2. fetch `{AISK_REGISTRY}/registry.json`
3. 输出格式：
   ```
   skill-sets:
     arch       refresh-arch, check-arch
     task       prepare-task, close-task

   standalone:
     setup-hooks
     setup-permissions
     sync-rules    [内部工具，不可单独删除]

   manager:
     skills        [删除将清除所有已安装 skill]
   ```

---

## installed

1. 检查 `.ai-skills/skills/` 目录是否存在；不存在则输出"尚未安装任何 skill"并终止
2. 枚举 `.ai-skills/skills/` 下各子目录，读取 `config.json`
3. 输出 name 和 description（以及所属 set，若有）

---

## install `<name>`

> **[写操作约束]** 每次安装必须同时写入两处，缺一不可：
> - `.claude/commands/aisk/{skill-name}.md` — Claude Code 可执行的命令文件
> - `.ai-skills/skills/{name}/config.json` — 安装记录（供 `installed` 和外部工具读取）

1. 读取 `.ai-skills/config.json`，获取 `AISK_REGISTRY`；不存在则提示先运行 bootstrap 并终止
2. 若 `.ai-skills/skills/{name}/` 已存在，提示"已安装 {name}，是否重新安装？[y/N]"，用户未确认则终止
3. fetch `{AISK_REGISTRY}/registry.json`，查找 `name`（先查 sets，再查 skills）；未找到则报错终止
4. fetch `{AISK_REGISTRY}/{path}/config.json`，读取元数据
5. 确定 skill 文件列表：
   - skill-set：config.json 的 `skills` 字段
   - 单 skill：仅 `[name]`
6. 对每个 skill，下载 `{AISK_REGISTRY}/{path}/{skill-name}.md` 到 `.claude/commands/aisk/{skill-name}.md`
7. **[必须执行]** 写入安装记录：
   - 将 config.json 保存到 `.ai-skills/skills/{name}/config.json`（目录不存在则创建）
8. 执行安装指令：
   a. fetch `{AISK_REGISTRY}/{path}/resource/install.md`
   b. 若 404，跳过
   c. 若成功获取，按文件中的指令操作（指令为 AI 可读 Markdown，shell 操作由 AI 执行）
9. 输出安装摘要：列出已写入的全部文件（含 `.ai-skills/` 路径），确认两处均已写入

---

## remove `<name>`

1. 读取 `.ai-skills/config.json`，获取 `AISK_REGISTRY`；不存在则提示先运行 bootstrap 并终止
2. 检查 `.ai-skills/skills/{name}/config.json` 是否存在；不存在则提示"未找到已安装的 {name}"并终止
3. 读取 config.json：
   - 若 `internal: true`，提示"{name} 是内部工具，不支持单独删除"并终止
   - 若 `name === "skills"`，执行管理器清除流程（见下方）
4. 若 `.ai-skills/skills/{name}/resource/uninstall.md` 存在，按文件中的指令操作
5. 删除 `.claude/commands/aisk/` 中该 skill-set / skill 对应的 .md 文件
6. 删除 `.ai-skills/skills/{name}/`
7. 输出删除摘要

**管理器清除流程（`remove skills`）：**

提示："这将删除 skill 管理器及所有已安装的 skill，确认？[y/N]"，用户未确认则终止。确认后：
1. 删除 `.claude/commands/aisk/` 目录及其所有内容
2. 删除 `.ai-skills/skills/` 目录及其所有内容
3. 输出清除摘要
