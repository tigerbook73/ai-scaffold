# Phase 4 设计文档 — 购物车

## 架构总览

```
src/
├── app/
│   ├── cart/
│   │   ├── page.tsx                      ← 新建：购物车页面（Server Component）
│   │   └── loading.tsx                   ← 新建：路由级骨架屏
│   └── products/[handle]/
│       └── page.tsx                      ← 修改：替换 VariantSelector → ProductForm
├── components/
│   ├── cart/
│   │   ├── AddToCartButton.tsx           ← 新建：Client Component
│   │   ├── CartItem.tsx                  ← 新建：Client Component（含 useOptimistic）
│   │   ├── CartSummary.tsx               ← 新建：Server Component（价格汇总 + 结账）
│   │   └── CartCount.tsx                 ← 新建：async Server Component（Header 用）
│   ├── product/
│   │   └── ProductForm.tsx               ← 新建：Client Component（替代 VariantSelector）
│   └── layout/
│       └── Header.tsx                    ← 修改：新增购物车图标区域
└── lib/
    ├── shopify/
    │   ├── mutations/
    │   │   └── cart.ts                   ← 新建：4 个 Cart Mutation
    │   ├── queries/
    │   │   └── cart.ts                   ← 新建：GET_CART_QUERY + CART_FRAGMENT
    │   ├── types.ts                      ← 修改：扩展 Cart 类型，新增 CartLine / CartCost
    │   └── client.ts                     ← 修改：新增 5 个 Cart API 函数
    └── actions/
        └── cart.ts                       ← 新建："use server" Server Actions
```

## 数据流

```
用户点击"Add to Cart"
        ↓
<ProductForm /> 持有当前选中的 matchedVariant.id
        ↓
<AddToCartButton variantId={...} /> onClick
        ↓
startTransition → addToCart(variantId) [Server Action]
        ↓
读 Cookie "cartId"
  ├── 若无 → cartCreate() → 写 Cookie
  └── 若有 → 直接继续
        ↓
cartLinesAdd(cartId, [{ merchandiseId: variantId, quantity: 1 }])
        ↓
revalidateTag("cart") → Header CartCount 重新渲染
        ↓
返回 { success: true } → Button 恢复正常状态
```

```
用户修改购物车数量
        ↓
<CartItem /> 数量 +/- 按钮
        ↓
startTransition:
  addOptimistic(newQuantity)      ← UI 立即更新
  updateCartQuantity(lineId, qty) ← 后台 Server Action
        ↓
cartLinesUpdate(cartId, [{ id: lineId, quantity: qty }])
        ↓
revalidateTag("cart") → 服务端同步
```

## GraphQL 设计

### CART_FRAGMENT（定义在 queries/cart.ts，供 mutations/cart.ts 复用）

```graphql
fragment CartDetail on Cart {
  id
  checkoutUrl
  totalQuantity
  lines(first: 100) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          selectedOptions {
            name
            value
          }
          price {
            amount
            currencyCode
          }
          product {
            title
            handle
            featuredImage {
              url
              altText
            }
          }
        }
      }
    }
  }
  cost {
    subtotalAmount {
      amount
      currencyCode
    }
    totalTaxAmount {
      amount
      currencyCode
    }
    totalAmount {
      amount
      currencyCode
    }
  }
}
```

**关键字段说明：**

- `totalQuantity`：购物车商品总件数（Header 显示用）
- `lines(first: 100)`：购物车条目，学习项目限 100 条，生产环境需分页
- `... on ProductVariant`：Inline Fragment，因为 `merchandise` 是 `Merchandise` Union Type
- `cost.totalTaxAmount`：可能为 `null`（未配置税率时），类型定义需可空

### GraphQL 新概念（Phase 4 学习重点）

| 概念         | 体现                                                               |
| ------------ | ------------------------------------------------------------------ |
| Mutations    | `cartCreate`、`cartLinesAdd`、`cartLinesUpdate`、`cartLinesRemove` |
| Payload 模式 | 每个 Mutation 返回 `{ cart, userErrors }`                          |
| `userErrors` | 业务错误通过此字段传递，HTTP 始终 200                              |
| Input Types  | `CartInput`、`CartLineInput`、`CartLineUpdateInput`                |

## 类型设计

```typescript
// types.ts 扩展
export interface CartLineMerchandise {
  id: string;
  title: string;
  selectedOptions: SelectedOption[];
  price: MoneyV2;
  product: {
    title: string;
    handle: string;
    featuredImage: ProductImage | null;
  };
}

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: CartLineMerchandise;
}

export interface CartCost {
  subtotalAmount: MoneyV2;
  totalTaxAmount: MoneyV2 | null;
  totalAmount: MoneyV2;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: { nodes: CartLine[] };
  cost: CartCost;
}

export type CartActionResult = { success: true } | { success: false; error: string };
```

## 组件职责

### ProductForm（Client Component）

- 取代 ProductPage 中的 `VariantSelector`
- 自管 `selected` 状态（Record<optionName, optionValue>）
- 内部计算 `matchedVariant`，传给 `AddToCartButton`
- 无选项商品（单 Variant）：直接显示价格 + 按钮
- 有选项商品：显示选项 selects + 匹配价格 + 按钮

### AddToCartButton（Client Component）

- 接收 `variantId: string`、`availableForSale: boolean`
- 用 `useTransition` 管理 pending 状态
- 不使用 `useOptimistic`（加入购物车本身没有乐观 UI 需求）

### CartItem（Client Component）

- 接收 `line: CartLine` prop
- 用 `useOptimistic` 管理 `optimisticQuantity`
- 数量减到 0 时触发删除（`removeFromCart`）
- 图片用 `next/image`

### CartSummary（Server Component）

- 接收 `cart: Cart` prop
- 显示 subtotalAmount、totalTaxAmount（可空）、totalAmount
- "Checkout"按钮为普通 `<a href={cart.checkoutUrl}>`

### CartCount（async Server Component）

- 读 Cookie → 调用 `getCart` → 返回 `totalQuantity`
- 用于 Header 中，由 `<Suspense>` 包裹
- 渲染购物车图标 Link 和数量 badge

## 缓存策略

| 操作                                      | 策略                                            |
| ----------------------------------------- | ----------------------------------------------- |
| `getCart`                                 | `no-store`（购物车实时数据）                    |
| `createCart` / `addCartLines` 等 Mutation | `no-store`                                      |
| 购物车页面                                | 动态渲染（因读取 Cookie）                       |
| Header CartCount                          | 动态渲染（因 Suspense 内为 async RSC + Cookie） |

## Cookie 规范

```typescript
{
  name: "cartId",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365, // 1 年
  // secure: true → Vercel 部署时建议开启，本地开发不强制
}
```
