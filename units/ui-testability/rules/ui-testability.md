---
paths: ["src/components/**/*.tsx", "src/app/**/*.tsx", "src/context/**/*.tsx"]
---

# UI 可测试性规范

> 约束对象：UI 源码。

---

## 核心原则

UI 结构的设计必须面向**可测试性**。所有 UI 代码必须为测试提供确定性的、稳定的、不依赖 DOM 层级和样式类名的定位锚点。

---

## 选择器优先级

测试定位器按以下优先级选择，能用高优先级时不得退化到低优先级：

1. **语义选择器**：`getByRole`、`getByLabel`、`getByText`
2. **`data-testid`**：兜底手段，或语义选择器无法精准定位时使用

---

## 1. 图标及无显式文本的交互组件

纯图标按钮、无文字的表单控件，必须配置具备业务语义的 `aria-label`。

```tsx
// ❌
<button className="p-2"><TrashIcon /></button>

// ✅
<button aria-label="Delete product" className="p-2"><TrashIcon /></button>
```

---

## 2. 带显式文本的表单组件

label 与 input 之间必须存在无障碍关联（aria 或 HTML5 标准关联）。

`page.getByLabel()` 和 `getByLabelText()` 均依赖此关联。具体实现方式由使用的 UI 库决定。

---

## 3. 多语言环境下的按钮

满足以下任一条件时，有显示文本的按钮也必须注入 `data-testid`：

- 项目已接入 i18n 框架
- 按钮文案来自后端或 CMS（运行时动态）
- 同一页面存在多个同名按钮且无父级 scope 可区分

```tsx
// ❌ 文案变更后测试崩溃
<button>保存修改</button>

// ✅
<button data-testid="settings-save-btn">保存修改</button>
```

---

## 4. 布局容器与页面区块

复杂的页面区块（侧边栏、卡片区域、弹窗）必须配置 `data-testid` 作为测试作用域隔离边界。

```tsx
<aside data-testid="product-sidebar">...</aside>
<div data-testid="order-list">...</div>
```

---

## 5. 动态列表渲染

`map` 渲染的列表项，严禁用数组 `index` 作为 `data-testid` 的一部分，必须使用业务唯一标识。

```tsx
// ❌ 顺序变化后定位失效
items.map((item, index) => <div data-testid={`item-${index}`}>...</div>);

// ✅
items.map((item) => <div data-testid={`item-${item.id}`}>...</div>);
```

**列表项内部的子元素**（按钮、链接等），优先在父级 scope 内用语义选择器定位，无需重复注入带 ID 的 `data-testid`：

```tsx
// ✅ 父级 scope + 语义选择器，无需在子元素上重复带 ID
const card = page.locator('[data-testid="address-item-xxx"]');
await card.getByRole("link", { name: "Edit" }).click();
await card.getByText("Delete").click();

// ⛔ 不必要的冗余
<Link data-testid={`addresses-edit-link-${encodedId}`}>Edit</Link>;
```

子元素若确实需要 `data-testid`（如文案不稳定、满足规则 3 的条件），使用通用命名即可，依赖父级 scope 保证唯一性：

```tsx
<li data-testid={`address-item-${encodedId}`}>
  <Link data-testid="addresses-edit-link">Edit</Link> {/* 在父级 scope 内唯一 */}
  <button data-testid="addresses-delete-btn">Delete</button>
</li>
```

---

## 6. data-testid 命名规范

**页面级组件（非复用）：** 格式 `[page-name]-[element-name]`

```
settings-save-btn
product-list-filter-panel
order-detail-cancel-btn
```

**可复用原子组件：** 严禁内部硬编码 `data-testid`，必须通过 Props 透传。

```tsx
// ❌
function Button({ children }) {
  return <button data-testid="button">{children}</button>;
}

// ✅
function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>;
}
```

---

## 检查义务

生成或修改 UI 代码时，自动检查第 1–6 条规范，不符合时主动修正。

若本次变更涉及 `data-testid` 或 `aria-label` 的增删改，主动扫描对应测试文件，提出同步建议。
