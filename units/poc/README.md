# poc

## 干什么的

`poc` 是安装流程验证单元，用于覆盖 ai-unit 的四类组件：skill、rule、script 和 resource。它主要用于确认发布、依赖解析、资源安装、规则安装和 hook 脚本安装是否按预期工作。

该单元不是面向日常开发的业务 skill，而是给安装器和集成测试使用的 PoC。

## 怎么用

1. 运行 `pnpm register` 将单元发布到本机 agent 目录。
2. 在 agent 对话中请求执行 `poc`。
3. agent 会确认 `poc` 已安装，展示组件列表和依赖状态。
4. agent 会读取并展示 `.aisk/poc-unit/resources/readme.md` 的内容。

## 组件

- Skill：`skills/poc.md`
- Rules：`rules/poc-rule.md`、`rules/poc-rule-nextjs.md`
- Script：`scripts/poc-hook.ts`
- Resource：`resources/readme.md`
- Dependency：`poc-dep`

## 注意事项

- `poc` 依赖 `poc-dep`，用于验证依赖单元会一并安装。
- `poc-rule-nextjs` 带有条件说明，仅用于验证条件规则元数据。
