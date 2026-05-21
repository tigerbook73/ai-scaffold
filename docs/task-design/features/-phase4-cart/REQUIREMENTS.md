# Phase 4 需求文档 — 购物车

## 目标

实现完整的购物车流程，掌握 Server Actions 与 Cookie Session，理解 GraphQL Mutations 的 Payload 模式与错误处理。

## 功能需求

### F1 — 加入购物车

- 商品详情页有"Add to Cart"按钮
- 按钮与变体选择联动（选中的变体才能加入购物车）
- 按钮触发 Server Action，无需页面刷新
- 按钮在操作进行中禁用并显示 loading 状态
- 未上架（`availableForSale: false`）的变体禁用按钮并显示"Out of Stock"
- 操作完成后 Header 购物车计数自动更新

### F2 — 购物车页面（`/cart`）

- 显示所有已加入的商品行（variant 名称、图片、单价、数量）
- 支持数量增减（+/- 按钮）
- 支持删除单行商品
- 数量和删除操作使用 Optimistic UI（`useOptimistic`），立即反馈，不等 API
- 显示小计（Subtotal）和合计（Total）价格
- 购物车为空时显示引导文案 + 继续购物链接

### F3 — 结账

- 购物车页面有"Checkout"按钮
- 点击跳转至 `cart.checkoutUrl`（Shopify 原生结账页）
- 使用普通 `<a href>` 链接，无需 JS 拦截

### F4 — 购物车持久化

- Cart ID 存入 Cookie（`cartId`，httpOnly，1 年有效期）
- 刷新页面或关闭重开后，购物车状态恢复
- 同一 Cookie 对应同一个 Shopify Cart，无需重新创建

### F5 — Header 购物车图标

- Header 右侧显示购物车图标（ShoppingCart icon）
- 购物车有商品时图标上方显示数量小红点
- 点击图标跳转至 `/cart`
- 图标区域用 Suspense 包裹，数据加载不阻塞 Header 渲染

## 非功能需求

- 所有购物车 API 调用使用 `cache: "no-store"`（购物车数据实时变化）
- Cookie 使用 `httpOnly: true, sameSite: "lax"`（防 XSS，兼容同站跳转）
- TypeScript 严格模式，无 `any`
- Server Actions 必须标注显式返回类型

## 不在本阶段范围内

- Checkout UI 自建（跳转 Shopify 原生结账页）
- 优惠码 / 折扣功能
- 购物车数量上限提示（超出库存）
- 多地区 / 多货币（`buyerIdentity`）
- 购物车过期处理（Cart 过期后自动创建新 Cart）
