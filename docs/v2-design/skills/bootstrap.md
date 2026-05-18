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
1. 确认目标目录，检测存量项目（CLAUDE.md / .ai-rules/ 是否已存在）
   - 存在冲突文件：列出并询问用户是否覆盖，不自动覆盖
2. 扫描目标项目代码，生成 .ai-rules/context/architecture.md
   - AI 维护区（项目概览 / 目录结构 / 典型模式）：自动填充
   - 人工维护区（架构约束 / 例外 / 遗留问题）：留空，附提示注释
3. 追加 CLAUDE.md 引用块（aisc:start/end 标记，已存在则跳过）
4. 从 scaffold 仓库的 docs/v2-design/skills/ 复制所有 skill 到目标项目的 .claude/commands/aisc/
5. 调用 setup-permissions
6. 询问是否安装 git hooks，是则调用 setup-hooks
7. 输出初始化摘要，提示用户下一步：填写 architecture.md 人工维护区的架构约束
