# Phase 4 进度记录 — 购物车

## 状态：🚧 进行中（待用户验收）

## 交付物清单

### 文档层

- [x] `docs/features/phase4-cart/REQUIREMENTS.md`
- [x] `docs/features/phase4-cart/DESIGN.md`
- [x] `docs/features/phase4-cart/PROGRESS.md`

### 数据层

- [x] `src/lib/shopify/types.ts` — 扩展 Cart / CartLine / CartCost 类型，导出 MoneyV2 / ProductImage / SelectedOption
- [x] `src/lib/shopify/mutations/cart.ts` — CART_CREATE / CART_LINES_ADD / CART_LINES_UPDATE / CART_LINES_REMOVE
- [x] `src/lib/shopify/queries/cart.ts` — GET_CART_QUERY + CART_FRAGMENT（供 mutations 复用）
- [x] `src/lib/shopify/client.ts` — getCart / createCart / addCartLines / updateCartLines / removeCartLines
- [x] `src/lib/actions/cart.ts` — addToCart / removeFromCart / updateCartQuantity

### 组件层

- [x] `src/components/cart/AddToCartButton.tsx` — Client Component，useTransition
- [x] `src/components/cart/CartItem.tsx` — Client Component，useOptimistic
- [x] `src/components/cart/CartSummary.tsx` — Server Component，价格汇总 + Checkout 链接
- [x] `src/components/cart/CartCount.tsx` — async Server Component，Header 购物车图标
- [x] `src/components/product/ProductForm.tsx` — Client Component，替代 VariantSelector
- [x] `src/components/layout/Header.tsx` — 新增购物车图标区域（Suspense 包裹）

### 路由层

- [x] `src/app/cart/page.tsx` — 购物车页面
- [x] `src/app/cart/loading.tsx` — 路由级骨架屏
- [x] `src/app/products/[handle]/page.tsx` — 替换 VariantSelector → ProductForm

## 验收标准

- [ ] 商品详情页选择变体后可点击"Add to Cart"
- [ ] 未上架变体显示"Out of Stock"，按钮禁用
- [ ] Header 购物车图标显示正确数量
- [ ] `/cart` 显示所有购物车商品
- [ ] 购物车修改数量：Optimistic 立即更新
- [ ] 购物车删除商品：商品消失，价格更新
- [ ] 点击"Checkout"跳转 Shopify 结账页
- [ ] 刷新页面后购物车状态保持（Cookie 持久化）
- [ ] `pnpm lint` 无报错 ✅
- [ ] TypeScript 编译无错误 ✅

## 备注

- `revalidateTag` 在此版本 Next.js 中需 2 个参数，改用 `revalidatePath('/', 'layout')` 刷新整个路由树
- `ProductForm` 自包含变体选择 + AddToCartButton，取代了 Phase 1 的 VariantSelector（后者保留但不再在 ProductPage 中使用）
