# setup-hooks

为 Node.js 项目安装 git hooks（commitlint + 可选 lint-staged）。

**约束**
- [写操作] 修改 package.json 和 hook 配置文件
- 检测到 package.json 不存在时终止，提示不支持非 Node.js 项目
- 已安装的 hook 跳过，不覆盖用户自定义配置

**输入**（`$ARGUMENTS`，可选）
- 无参数 → 仅安装 commitlint
- `--lint-staged` → 同时安装 lint-staged（pre-commit 自动 lint + format）

**步骤**
1. 确认 package.json 存在，否则终止
2. 安装 husky，初始化（npx husky init）
3. 安装 @commitlint/cli + @commitlint/config-conventional
4. 写入 commitlint.config.js（extends conventional）
5. 添加 commit-msg hook：npx --no -- commitlint --edit $1
6. 若 --lint-staged：安装 lint-staged，添加 pre-commit hook，提示用户在 package.json 配置 lint-staged 规则
7. 输出安装摘要
