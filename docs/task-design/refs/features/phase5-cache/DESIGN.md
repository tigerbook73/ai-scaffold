# Phase 5 设计文档 — 缓存策略

## 架构概览

```
Shopify 后台
  │  商品/Collection 更新
  ▼
POST /api/webhooks/shopify
  │  验证 HMAC → 解析 topic → revalidateTag
  ▼
Next.js Data Cache 失效
  │
  ▼
下次请求重新 fetch → 回填缓存
```

## 核心概念：Next.js Data Cache 与 GraphQL

### 为什么 GraphQL 默认无法被 HTTP 缓存？

GraphQL 请求使用 POST 方法，HTTP 缓存层（浏览器、CDN）只缓存 GET 请求。Next.js 在 `fetch` 层做了特殊处理：在 Server Component 内部调用 `fetch` 时，Next.js 会拦截并在**服务端内存**中缓存响应，绕过了"POST 不可缓存"的 HTTP 语义。

这就是为什么我们的 `shopifyFetch` 封装能在 Next.js 中实现缓存——它走的是 Next.js 的 Data Cache，而不是 HTTP 缓存。

### cache 选项的三种模式

| 选项                           | 行为                                        | 适用场景                    |
| ------------------------------ | ------------------------------------------- | --------------------------- |
| `cache: "force-cache"`（默认） | 永久缓存，直到手动失效                      | 商品、Collection 数据       |
| `next: { tags: [...] }`        | 带 tag 的持久缓存，`revalidateTag` 精准失效 | 需要 Webhook 驱动更新的数据 |
| `cache: "no-store"`            | 不缓存，每次请求重新 fetch                  | 购物车、搜索、per-user 数据 |

## 模块设计

### 1. 缓存 Tag 规范

```
TAGS = {
  products: "products",                    // 商品列表
  product: (handle) => `product-${handle}`,// 单个商品
  collections: "collections",              // Collection 列表
  collection: (handle) => `collection-${handle}`, // 单个 Collection
  cart: "cart",                            // 购物车（供 CartCount 使用）
}
```

### 2. `shopifyFetch` 缓存参数透传

`client.ts` 中的 `shopifyFetch` 已接受 `cache` 参数，各函数按需传入：

```ts
// 商品查询 — 带 tag 缓存
fetch(url, {
  next: { tags: [TAGS.products, TAGS.product(handle)] },
});

// 购物车查询 — 不缓存
fetch(url, { cache: "no-store" });
```

### 3. `/api/webhooks/shopify` Route Handler

```
src/app/api/webhooks/shopify/route.ts
```

**请求流程**：

1. 读取 `X-Shopify-Hmac-Sha256` 请求头
2. 用 `SHOPIFY_WEBHOOK_SECRET` 计算 HMAC-SHA256，对比请求头值
3. 验证失败 → 返回 `401`
4. 读取 `X-Shopify-Topic` 请求头（如 `products/update`）
5. 根据 topic 调用对应 `revalidateTag`
6. 返回 `{ revalidated: true, topic, timestamp }`

**Topic → Tag 映射**：

| Shopify Topic        | 调用                                                           |
| -------------------- | -------------------------------------------------------------- |
| `products/create`    | `revalidateTag("products")`                                    |
| `products/update`    | `revalidateTag("products")` + `revalidateTag("product-${id}")` |
| `products/delete`    | `revalidateTag("products")`                                    |
| `collections/update` | `revalidateTag("collections")`                                 |

### 4. Phase 4 遗留修复

**问题**：`cart.ts` 中用 `revalidatePath('/', 'layout')` 刷新整个路由树，粒度太粗。

**原因**：`revalidateTag` 单参数调用在当前 Next.js 类型声明中报错（类型签名变动）。

**修复方案**：通过 `next/cache` 导入 `revalidateTag`，并补充 `cart` tag 到 `CartCount` 的 fetch 调用，使购物车数量在 Server Action 完成后精准失效。

```ts
// 修复前
revalidatePath("/", "layout");

// 修复后
revalidateTag("cart");
```

## 文件变更清单

| 文件                                    | 变更类型 | 说明                                       |
| --------------------------------------- | -------- | ------------------------------------------ |
| `src/lib/shopify/client.ts`             | 修改     | 为商品/Collection 函数加 `next: { tags }`  |
| `src/lib/shopify/cache-tags.ts`         | 新增     | 集中定义 tag 常量                          |
| `src/app/api/webhooks/shopify/route.ts` | 新增     | Webhook Route Handler                      |
| `src/lib/actions/cart.ts`               | 修改     | `revalidatePath` → `revalidateTag('cart')` |
| `src/components/cart/CartCount.tsx`     | 修改     | fetch 加 `next: { tags: ['cart'] }`        |

## 学习重点

1. **Data Cache vs Request Memoization**：同一次请求内重复调用同一 URL 会被 dedup（Request Memoization）；跨请求复用才是 Data Cache
2. **`revalidateTag` 是服务端操作**：只能在 Server Component、Server Action、Route Handler 中调用
3. **HMAC 验证的必要性**：不验证签名的 Webhook 端点等于给任何人提供了缓存清除入口
