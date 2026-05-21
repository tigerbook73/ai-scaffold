# Phase 1 — 商品浏览 技术设计

## 目录结构变更

```
src/
├── app/
│   ├── products/
│   │   ├── page.tsx                  # 商品列表页（RSC）
│   │   └── [handle]/
│   │       └── page.tsx              # 商品详情页（RSC）
├── components/
│   ├── product/
│   │   ├── ProductCard.tsx           # 商品卡片（RSC）
│   │   └── VariantSelector.tsx       # Variant 选择器（Client Component）
├── lib/
│   └── shopify/
│       ├── types.ts                  # 扩展 ProductVariant / ProductDetail
│       └── queries/
│           └── product.ts            # 新增 GET_PRODUCT_BY_HANDLE 查询
```

---

## 数据模型扩展

在现有 `src/lib/shopify/types.ts` 基础上追加（不修改已有类型）：

```typescript
interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: MoneyV2;
  compareAtPrice: MoneyV2 | null;
}

// 商品详情页专用，扩展 Product
export interface ProductDetail extends Product {
  description: string;
  descriptionHtml: string;
  images: { nodes: ProductImage[] };
  variants: { nodes: ProductVariant[] };
  options: {
    name: string;
    values: string[];
  }[];
}
```

> `Product` 类型（列表卡片用）保持不变，`ProductDetail` 只在详情页使用。

---

## GraphQL 查询

### 商品列表（追加至 `src/lib/shopify/queries/product.ts`）

现有 `GET_PRODUCTS_QUERY` 已可复用（使用 `ProductCard` fragment），无需修改。

### 商品详情（新增）

```graphql
query GetProductByHandle($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    description
    descriptionHtml
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 5) {
      nodes {
        url
        altText
      }
    }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
      }
    }
    options {
      name
      values
    }
  }
}
```

---

## API 契约

### `getProducts()` — 复用 Phase 0 逻辑，迁移为独立函数

```typescript
// src/lib/shopify/client.ts 中新增
export async function getProducts(first = 20): Promise<Product[]>;
```

### `getProductByHandle()` — 新增

```typescript
export async function getProductByHandle(handle: string): Promise<ProductDetail | null>;
```

返回 `null` 时，调用方执行 `notFound()`。

---

## 页面设计

### `/products` — 商品列表页

- **渲染模式**：RSC，服务端直接调用 `getProducts()`
- **布局**：响应式网格（移动端 2 列，桌面端 4 列）
- **组件**：`<ProductCard>` — 图片（`next/image`）、名称、起始价格、链接至详情页
- **缓存**：`force-cache`（Phase 5 再精细化）

### `/products/[handle]` — 商品详情页

- **渲染模式**：RSC（数据获取）+ Client Component（Variant 选择）
- **`generateStaticParams`**：复用 `getProducts(20)` 取 handle 列表，构建时预生成
- **404 处理**：`getProductByHandle` 返回 `null` → `notFound()`
- **组件分工**：
  - 服务端：图片、标题、描述（`dangerouslySetInnerHTML`）
  - 客户端 `<VariantSelector>`：接收 `variants` 和 `options` 作为 props，内部用 `useState` 管理当前选中 Variant，向上回传选中价格

### `<VariantSelector>` 组件接口

```typescript
interface VariantSelectorProps {
  options: { name: string; values: string[] }[];
  variants: ProductVariant[];
}
```

选中逻辑：通过匹配 `selectedOptions` 找到对应 Variant，显示该 Variant 的 `price`。

---

## next.config.ts 变更

需添加 Shopify CDN 域名到 `images.remotePatterns`：

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'cdn.shopify.com',
    },
  ],
},
```

---

## 实施阶段

| 阶段 | 内容                                        | 关键文件                                                          |
| ---- | ------------------------------------------- | ----------------------------------------------------------------- |
| 1    | 扩展类型定义                                | `src/lib/shopify/types.ts`                                        |
| 2    | 新增 GraphQL 查询 + API 函数                | `src/lib/shopify/queries/product.ts`, `src/lib/shopify/client.ts` |
| 3    | 配置 next.config.ts（图片域名）             | `next.config.ts`                                                  |
| 4    | 实现 `ProductCard` 组件                     | `src/components/product/ProductCard.tsx`                          |
| 5    | 实现 `/products` 列表页                     | `src/app/products/page.tsx`                                       |
| 6    | 实现 `VariantSelector` 组件                 | `src/components/product/VariantSelector.tsx`                      |
| 7    | 实现 `/products/[handle]` 详情页            | `src/app/products/[handle]/page.tsx`                              |
| 8    | 验收：lint + typecheck + build + 浏览器测试 | —                                                                 |

---

## 测试计划

| 测试项       | 方式                                                      |
| ------------ | --------------------------------------------------------- |
| 商品列表渲染 | 浏览器访问 `/products`，确认网格布局与真实数据            |
| 商品详情渲染 | 访问已知商品 handle，确认图片、标题、价格正确             |
| Variant 切换 | 选择不同 Variant，确认价格更新                            |
| 404 场景     | 访问 `/products/invalid-handle-xyz`，确认返回 404         |
| 静态生成     | `pnpm build` 后检查构建输出中商品路由标记为 `○`（Static） |
| 类型与 lint  | `pnpm typecheck` + `pnpm lint` 无错误                     |
