# bootstrap

初始化项目的 AI scaffold，生成 architecture.md，安装所有 skill。

**约束**
- [写操作] 在目标项目上操作，不修改 scaffold 仓库本身
- 存量项目检测到冲突时，列出冲突文件并询问用户，不静默覆盖

**配置**（首次运行时询问，记住后无需重复）
- scaffold 仓库路径（用于复制 skill 文件，默认：~/.claude/ai-scaffold）

**输入**（`$ARGUMENTS`，可选）
- 无参数 → 在当前目录初始化
- `{path}` → 在指定目录初始化

**步骤**
1. 确认目标目录，检测存量项目（CLAUDE.md / architecture.md / .ai-rules/ 是否已存在）
   - 存在冲突文件：列出并询问用户是否覆盖，不自动覆盖
2. 调用 `refresh-arch` 扫描代码库，生成 `./architecture.md`
3. 从 scaffold 仓库的 `docs/v2-design/skills/` 复制所有 skill 到目标项目的 `.claude/commands/aisc/`
4. 调用 `setup-permissions`
5. 询问是否安装 git hooks，是则调用 `setup-hooks`
6. 输出初始化摘要：已生成文件列表，提示可用 `/aisc:audit` 检查代码与架构决策的对齐情况
