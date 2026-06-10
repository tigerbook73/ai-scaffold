# playwright

## 干什么的

`playwright` 提供 Playwright E2E 测试的编写规范，约束 `tests/e2e/` 下的测试文件。包含两条规则：

- **`playwright`**：定位器优先级（语义优先 → `data-testid` 兜底）、作用域链式定位写法
- **`playwright-shadcn`**：shadcn/ui（Radix Portal）特有场景的补充，包括 Select/Combobox 下拉选项定位、Dialog/Sheet 作用域隔离

## 怎么用

安装后，Claude 在编写或审查 E2E 测试文件时会自动应用以下约束：

- 按优先级选择定位器：`getByRole` > `getByLabel` > `getByText` > `getByTestId`
- 存在多个相同元素时，先用 `getByTestId` 定位容器，再在容器内用语义定位器定位子元素
- shadcn `Select` 的选项在 Portal 中，必须通过 `page` 而非父容器定位

## 组件

- Rule：`rules/playwright.md`（E2E 测试定位规范）
- Rule：`rules/playwright-shadcn.md`（shadcn/ui 补充）

## 注意事项

- 两条规则均激活于 `tests/e2e/**/*.spec.ts` 和 `tests/e2e/**/*.ts`，路径不符合时规则不生效。
- `playwright-shadcn` 仅补充 shadcn/ui 实现细节，需与 `playwright` 一起安装才有完整约束。
- 本 unit 无依赖，可独立安装。
