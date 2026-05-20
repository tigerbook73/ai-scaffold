# 创建全局技能

将技能提升到全局仓库，使其可通过 `/aisk/sync` 分发到任意项目。

**调用方式**：`/aisk/create-skill <参数>`

---

## 输入模式

`$ARGUMENTS` 有两种形式：

1. **文件路径**（现有 `.md` 文件路径）→ 直接将该文件提升为全局技能
2. **技能名称**（纯名称，如 `my-skill`）→ 由 Claude 根据当前对话上下文生成技能内容

---

## 步骤

### 公共前置步骤

1. 读取全局配置，获取 repo 路径：
   ```bash
   cat ~/.ai-skills/config.json
   ```
   若不存在，提示先运行 `npm run register` 并终止。

### 模式一：文件路径

2. 运行：
   ```bash
   npm --prefix {repo} run create-skill -- {file} [--name {name}] [--force]
   ```
   其中 `{file}` 为绝对路径（相对路径基于当前工作目录解析）。

### 模式二：技能名称

2. 确认名称格式（小写字母 + 连字符，如 `my-skill`）
3. 根据对话上下文生成技能内容，格式参考仓库中现有技能
4. 直接将内容写入 `{repo}/skills/{name}.md`
5. 运行：
   ```bash
   npm --prefix {repo} run build
   ```

### 完成

输出确认信息，提示：
- 在 ai-skills 仓库中执行 `git commit` 持久化
- 在目标项目中运行 `/aisk/sync` 分发

---

## 注意

- 此命令修改的是全局 ai-skills 仓库，不会立即影响当前项目
- 若只想在当前项目临时使用，直接在 `.claude/commands/aisk/` 中创建文件即可
