# poc-dep

## 干什么的

`poc-dep` 是 `poc` 的依赖验证单元。它用于确认 ai-unit 安装流程能够正确解析并安装依赖单元，同时验证依赖单元中的 skill 和 resource 可被访问。

该单元主要服务于安装器测试，不是日常开发工作流。

## 怎么用

1. 运行 `pnpm register` 发布单元。
2. 直接请求 agent 执行 `poc-dep`，或通过执行依赖它的 `poc` 间接验证。
3. agent 会确认 `poc-dep` 已安装。
4. agent 会读取并展示 `.aisk/poc-dep-unit/resources/info.md` 的内容。

## 组件

- Skill：`skills/poc-dep.md`
- Resource：`resources/info.md`

## 注意事项

- 该单元通常不需要单独使用。
- 它的主要价值是验证依赖解析和资源安装路径。
