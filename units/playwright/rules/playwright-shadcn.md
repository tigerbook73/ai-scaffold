---
paths: ["tests/e2e/**/*.spec.ts", "tests/e2e/**/*.ts"]
---

# Playwright / shadcn/ui 实现细节

> 本文档是 `playwright.md` 的 shadcn/ui 补充，说明 Radix UI 底层行为对 E2E 测试写法的影响。

---

## Select / Combobox

shadcn 的 `Select` 基于 Radix UI，下拉选项渲染在 Portal 中（挂载到 body 末尾），必须通过 `page` 而非父容器定位选项：

```typescript
// 打开 Select
await page.getByRole("combobox", { name: "Status" }).click();

// 选项在 Portal 中，用 page 定位，不能用父容器
await page.getByRole("option", { name: "Active" }).click();
```

---

## Dialog / Sheet 作用域

`DialogContent` 上的 `data-testid`是测试作用域的边界：

```typescript
const dialog = page.getByTestId("confirm-dialog");
await dialog.getByTestId("confirm-delete-btn").click();
```
