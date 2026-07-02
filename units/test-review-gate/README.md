# test-review-gate

## 干什么的

`test-review-gate` 用于约束测试文件的 AI 编辑行为。它通过规则和 pre-commit 脚本要求测试文件维护准确的元数据，并禁止 AI 修改人工审查字段。

该单元会检查测试文件中的 `@cases` 与 `it()` / `test()` 名称是否一致，并保护 `@reviewed-by (!HUMAN EDIT ONLY):` 不被自动改写。

## 怎么用

1. 运行 `/setup add test-review-gate`（或 `ai-skills add test-review-gate`）安装规则和 hook 脚本。
2. 修改 `*.test.ts`、`*.spec.ts`、`*.test.js` 或 `*.spec.js` 测试文件时，agent 会按规则维护测试头信息和 suite 元数据。
3. 提交前，pre-commit hook 会检查 staged 测试文件。
4. 若检查失败，根据脚本输出修正 `@cases`、测试名称或受保护字段后重新提交。

## 组件

- Rule：`rules/test-review-gate.md`
- Scripts：
  - `scripts/check-reviewed-by-commit-marker.ts`
  - `scripts/check-test-cases-match-it.ts`

## 注意事项

- `@reviewed-by (!HUMAN EDIT ONLY):` 只能由人工审查者维护。
- 每个 `it()` / `test()` 名称应使用“条件 -> 预期行为”的清晰格式。
- 该单元没有 skill；它主要通过规则和 pre-commit hook 生效。
