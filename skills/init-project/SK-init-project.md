# init-project

为当前项目配置全局安装的 aisk skill 的使用环境。

**用法**：`/aisk/init-project`（无参数）

---

## 约束

- 写入 `.gitignore`、`.claude/settings.local.json`，并在当前项目根目录创建 `.ai-skills/`

## 步骤

### 第一步 — 检查安装状态

确认 `~/.sk-skills/` 存在。若不存在，停止并输出："Run `pnpm register` in the ai-scaffold repo first."

### 第二步 — 更新 .gitignore

检查 `.gitignore` 中是否已包含 `.ai-skills` 或 `.ai-skills/`。

- 若已存在：跳过此步骤
- 若不存在：
  - 展示待添加的行：`.ai-skills/`
  - 等待用户确认后再写入
  - 将 `.ai-skills/` 追加到 `.gitignore`（若文件不存在则创建）

### 第三步 — 创建 .ai-skills/ 目录

若项目根目录下不存在 `.ai-skills/`，自动创建（无需确认）。

### 第四步 — 更新 settings.local.json

读取 `.claude/settings.local.json`。若不存在，以 `{"permissions": {"allow": []}}` 创建。

在 `permissions.allow` 中追加以下条目（若尚未存在，或未被更宽泛的已有权限覆盖）：

- `Read(~/.sk-skills/*)` —— 允许读取已安装的运行时文件
- `Bash(node ~/.sk-skills/out/*)` —— 允许运行已安装的 skill 脚本

使用 `settings.local.json` 是因为这些条目包含机器专属的绝对路径，不应提交到代码库。

### 第五步 — 输出摘要

输出已配置内容的摘要，然后建议以下可选的初次配置后续步骤：

---

## 注意事项

- 本 skill 是幂等的：在已配置项目上再次运行是安全的
- `architecture.md` 由 `/aisk/refresh-arch` 按项目生成在 `.ai-skills/` 下；该目录不应提交，因此需要 `.gitignore` 条目
