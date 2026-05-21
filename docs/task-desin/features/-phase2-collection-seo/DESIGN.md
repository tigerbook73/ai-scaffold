# Phase 2 — Collection 导航与 SEO 技术设计

## 技术选型

| 决策       | 选择                                    | 原因                                             |
| ---------- | --------------------------------------- | ------------------------------------------------ |
| 分页       | URL cursor（`?after=xxx`）              | 无客户端 JS，RSC 直接读 searchParams，URL 可分享 |
| SEO 数据源 | Shopify `seo.title` / `seo.description` | 直接复用商家在后台配置的 SEO 信息                |
| 店铺名     | `shop { name }` 动态查询                | 与 Shopify 后台保持同步                          |
| OG 图      | 直接用 Shopify CDN URL                  | 无需自建图片生成服务                             |

---

## 数据模型

### 新增类型（`src/lib/shopify/types.ts`）

```ts
interface SEO {
  title: string | null;
  description: string | null;
}

interface Shop {
  name: string;
  description: string | null;
}

// 替换 Collection 骨架
export interface Collection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: ProductImage | null;
  seo: SEO;
}

export interface CollectionDetail extends Collection {
  products: {
    nodes: Product[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}
```

`ProductDetail` 新增 `seo: SEO` 字段。

---

## GraphQL 查询设计

### GraphQL 新概念（Phase 2）

**Fragment**：将 `PRODUCT_CARD_FRAGMENT` 从 `product.ts` 导出，在 `collection.ts` 的
`GET_COLLECTION_BY_HANDLE_QUERY` 中复用，避免重复字段定义。

**Alias**（学习说明）：当需要在同一查询中多次调用同名字段时使用，例如：

```graphql
query {
  featured: collection(handle: "featured") {
    title
  }
  sale: collection(handle: "sale") {
    title
  }
}
```

本阶段不强制使用 Alias，在注释中说明即可。

### 查询文件

| 文件                          | 查询                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| `queries/product.ts`          | 导出 `PRODUCT_CARD_FRAGMENT`，`GET_PRODUCT_BY_HANDLE_QUERY` 加 seo 字段 |
| `queries/collection.ts`（新） | `GET_COLLECTIONS_QUERY`、`GET_COLLECTION_BY_HANDLE_QUERY`               |
| `queries/shop.ts`（新）       | `GET_SHOP_QUERY`                                                        |

---

## API 客户端层（`client.ts`）

新增函数：

| 函数                                          | 返回                       | 用途              |
| --------------------------------------------- | -------------------------- | ----------------- |
| `getCollections(first)`                       | `Collection[]`             | 系列列表页        |
| `getCollectionByHandle(handle, first, after)` | `CollectionDetail \| null` | 系列商品页 + 分页 |
| `getProductHandles()`                         | `{ handle: string }[]`     | sitemap           |
| `getCollectionHandles()`                      | `{ handle: string }[]`     | sitemap           |
| `getShop()`                                   | `Shop`                     | 全站 metadata     |

---

## 路由与页面

### `/collections` — 系列列表页

```
src/app/collections/page.tsx
```

- RSC，调用 `getCollections(20)`
- `generateMetadata`：title = "Collections"（由 layout 模板拼接店铺名）
- 渲染 `<CollectionCard>` 卡片网格

### `/collections/[handle]` — 系列商品页

```
src/app/collections/[handle]/page.tsx
```

- RSC + 动态路由
- `generateStaticParams`：预渲染已知系列
- `generateMetadata`：读取 `collection.seo.title ?? collection.title`
- `searchParams.after` 驱动 cursor 分页
- 展示 `<ProductCard>` 网格 + 翻页导航

### 翻页导航 UI

```
[← 上一页]  第 N 页  [下一页 →]
```

- "下一页"按钮：`href={/collections/${handle}?after=${endCursor}}`
- "上一页"：不支持（Shopify cursor 单向，实现反向需要额外记录 cursor 栈，Phase 2 不实现）

---

## SEO 设计

### Title 模板（`layout.tsx`）

```ts
export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();
  return {
    title: { template: `%s | ${shop.name}`, default: shop.name },
    description: shop.description ?? undefined,
  };
}
```

### 各页面 metadata

| 页面                    | title              | description                    | og:image          |
| ----------------------- | ------------------ | ------------------------------ | ----------------- |
| `/`                     | 店铺名             | 店铺描述                       | -                 |
| `/products`             | "All Products"     | -                              | -                 |
| `/products/[handle]`    | seo.title ?? title | seo.description ?? description | featuredImage.url |
| `/collections`          | "Collections"      | -                              | -                 |
| `/collections/[handle]` | seo.title ?? title | seo.description ?? description | image.url         |

---

## Sitemap 设计

```ts
// src/app/sitemap.ts
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([getProductHandles(), getCollectionHandles()]);
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/collections`, changeFrequency: "weekly", priority: 0.8 },
    ...products.map((p) => ({
      url: `${baseUrl}/products/${p.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...collections.map((c) => ({
      url: `${baseUrl}/collections/${c.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
```

---

## 测试计划

| 测试       | 方式                                  |
| ---------- | ------------------------------------- |
| 类型正确性 | `pnpm typecheck`                      |
| 代码规范   | `pnpm lint`                           |
| 页面渲染   | 浏览器访问各路由                      |
| SEO 标签   | 浏览器 DevTools `<head>` 检查         |
| Sitemap    | 浏览器访问 `/sitemap.xml`             |
| 分页       | 手动点击翻页，确认 URL 变化和商品切换 |
| 构建       | `pnpm build` 确认路由预生成           |
