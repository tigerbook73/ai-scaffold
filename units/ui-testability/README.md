# ui-testability

## 干什么的

`ui-testability` 提供 UI 源码的可测试性规范，约束 `src/` 下的 UI 文件（components、app、context）。目标是确保 UI 代码为测试提供稳定、确定性的定位锚点。

包含两条规则：

- **`ui-testability`**：核心规范，涵盖图标按钮的 `aria-label`、表单 label 关联、多语言按钮的 `data-testid`、布局容器隔离、动态列表命名、可复用组件透传、`data-testid` 命名规范
- **`ui-testability-shadcn`**：shadcn/ui 实现细节补充，包括 FormField label 关联、Button/Input 的 `data-testid` 透传、Dialog/Sheet 容器隔离写法

## 怎么用

安装后，Claude 在生成或修改 UI 代码时会自动检查以下内容：

- 纯图标按钮必须配置 `aria-label`
- label 与 input 之间必须有无障碍关联
- 多语言/动态文案按钮需注入 `data-testid`
- 复杂页面区块加 `data-testid` 作为测试作用域边界
- 动态列表项用业务唯一标识命名，禁止用数组 `index`
- 可复用原子组件禁止内部硬编码 `data-testid`，通过 props 透传

发现不符合时，直接修正而非仅提示。

## 组件

- Rule：`rules/ui-testability.md`（可测试性核心规范）
- Rule：`rules/ui-testability-shadcn.md`（shadcn/ui 补充）

## 注意事项

- 两条规则均激活于 `src/components/**/*.tsx`、`src/app/**/*.tsx`、`src/context/**/*.tsx`。
- `ui-testability-shadcn` 仅补充 shadcn/ui 实现细节，非 shadcn 项目可仅安装 `ui-testability`（目前 unit 级粒度为整体，暂不支持单条规则选择安装）。
- 本 unit 无依赖，可独立安装。通常与 `playwright` 和 `ui-coverage` 配合使用效果更好。
