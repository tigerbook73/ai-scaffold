# Phase 5 需求文档 — 缓存策略

## 目标

为 Shopify 商品数据设计合理的缓存层，通过 Shopify Webhook 实现按需失效，理解 Next.js Data Cache 的工作原理。

## 功能需求

### F1 — fetch 缓存标签

- 所有商品查询（`getProducts`、`getProductByHandle`）加 `next: { tags: [...] }` 缓存标签
- 所有 Collection 查询加对应缓存标签
- 搜索查询保持 `no-store`（搜索结果实时性要求高）
- 购物车相关查询保持 `no-store`（per-user 数据，不可缓存）

### F2 — `/api/webhooks/shopify` Webhook 端点

- 创建 Route Handler 接收 Shopify Webhook POST 请求
- 根据 Webhook topic（`products/update`、`collections/update` 等）调用对应 `revalidateTag`
- 验证请求 HMAC 签名，拒绝非法请求
- 返回标准 JSON 响应（`{ revalidated: true, topic, timestamp }`）

### F3 — 全站缓存策略梳理

明确每类页面的缓存模式：

| 页面                    | 缓存策略                     | 原因                          |
| ----------------------- | ---------------------------- | ----------------------------- |
| `/products`             | 静态 + revalidateTag         | 商品列表变化不频繁            |
| `/products/[handle]`    | `generateStaticParams` + ISR | 热门商品预渲染，冷门 ISR 兜底 |
| `/collections/[handle]` | 静态 + revalidateTag         | 同商品列表                    |
| `/search`               | `no-store`                   | 搜索结果需实时                |
| `/cart`                 | `force-dynamic`              | per-user 数据                 |

### F4 — 修复 Phase 4 遗留问题

- `cart.ts` Server Actions 中的 `revalidatePath('/', 'layout')` 改为 `revalidateTag('cart')`
- `CartCount` 查询加 `cart` tag，使 Header 购物车数量随 tag 失效而更新

## 非功能需求

- Webhook 端点必须验证 HMAC，防止伪造请求触发缓存清除
- 缓存 tag 命名遵循 `[resource]-[identifier]` 格式（如 `product-snowboard`、`collection-frontpage`）
- `SHOPIFY_WEBHOOK_SECRET` 通过环境变量注入，不硬编码

## 不在本阶段范围内

- Shopify 后台手动配置 Webhook（文档指引即可，不写脚本自动化）
- Stale-While-Revalidate（SWR）时间配置（`revalidate: N`）— 本阶段聚焦按需失效
- Edge Cache / CDN 层缓存（Vercel CDN 自动处理，不手动配置）
- 多 tag 精细化失效（如单个商品 tag `product-${handle}`）— 按需扩展
