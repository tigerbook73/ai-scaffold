# 创建全局技能

将一个技能文件添加到全局技能库，使其可通过 `/sync` 分发到任意项目。

**调用方式**：`/create-skill <参数>`

---

## 输入模式

`$ARGUMENTS` 有两种形式：

1. **文件路径**（路径指向现有 .md 文件）：直接将该文件添加为全局技能
2. **技能名称**（纯名称，如 `my-skill`）：由 Claude 根据当前对话上下文生成技能内容

---

## 步骤

### 公共前置步骤

1. 读取全局配置，获取 repo 路径：
   ```bash
   cat ~/.ai-skills/config.json
   ```
   - 若不存在，提示先运行 `node scripts/setup.js` 并终止

2. 读取 `{repo}/claude/file-tree.json`，确认当前技能列表

### 模式一：文件路径

3. 解析参数为绝对路径（若为相对路径，基于当前工作目录解析）
4. 读取该文件内容
5. 提取技能名称：使用文件名（去掉 `.md` 后缀）
6. 检查 `{repo}/claude/commands/{name}.md` 是否已存在：
   - 若存在，询问用户是否覆盖，未确认则终止
7. 将文件写入 `{repo}/claude/commands/{name}.md`

### 模式二：技能名称

3. 确认名称格式（小写字母 + 连字符，如 `my-skill`）
4. 询问用户该技能的功能描述（若未在参数中提供）
5. 根据描述和当前对话上下文生成技能内容（参考仓库中现有技能格式）
6. 检查 `{repo}/claude/commands/{name}.md` 是否已存在：
   - 若存在，询问用户是否覆盖，未确认则终止
7. 将生成内容写入 `{repo}/claude/commands/{name}.md`

### 公共后置步骤

8. 更新 `{repo}/claude/file-tree.json`：在 `files` 数组末尾追加：
   ```json
   {
     "path": "commands/{name}.md",
     "description": "{用户提供或从文件内容提取的描述}",
     "category": "custom",
     "en": null
   }
   ```
9. 输出确认：
   ```
   ✓ 技能已添加：{repo}/claude/commands/{name}.md
   ✓ file-tree.json 已更新

   运行 /sync 将新技能同步到当前项目。
   如需持久保存，请在 ai-skills 仓库中执行 git commit。
   ```

---

## 注意

- 此命令修改的是全局 ai-skills 仓库，不会立即影响当前项目
- 添加后需手动 commit ai-skills 仓库以持久化
- 若只想在当前项目使用，直接在 `.claude/commands/` 中创建文件即可，无需此命令
