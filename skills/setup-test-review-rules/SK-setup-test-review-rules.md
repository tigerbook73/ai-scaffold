# setup-test-review-rules

将 AI 辅助测试规则规范安装到当前 Node.js 项目中。

写入 `.claude/rules/test-review-rules.md`（AI 行为规则，作用范围限定为测试文件），并在 pre-commit hook 中追加一条条目，阻止缺少人工 `@reviewed-by` 签名的测试文件被提交。

**约束**

- [写操作] 始终覆盖 `.claude/rules/test-review-rules.md`；始终替换 `.husky/pre-commit` 中的 hook 条目（即使已存在）
- 仅适用于 Node.js 项目；要求 `~/.sk-skills/out/test-review-rules/setup-test-review-rules.js` 已存在（请先运行 `pnpm register`）
- 要求项目中已初始化 husky（`.husky/` 目录必须存在）

**步骤**

1. 确认当前目录存在 `.git/`。若不存在，停止并输出："Not a git repository."
2. 确认 `~/.sk-skills/out/test-review-rules/setup-test-review-rules.js` 已存在。若不存在，停止并输出："Run `pnpm register` first."
3. 运行：`node ~/.sk-skills/out/test-review-rules/setup-test-review-rules.js`
   - 若脚本退出码为 **2**，说明 husky 尚未配置。先运行 `/aisk/setup-precommit`，然后重试此步骤。
4. 报告已写入的内容（脚本会打印每个文件路径）。
