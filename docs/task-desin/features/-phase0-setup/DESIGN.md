# Phase 0 — 基础搭建 技术设计

## 技术选型

| 层次       | 选择                               | 说明                                  |
| ---------- | ---------------------------------- | ------------------------------------- |
| 框架       | Next.js 15 App Router + TypeScript | 使用 `src/` 目录结构，strict mode     |
| 样式       | Tailwind CSS + shadcn/ui           | Phase 0 只做 init，组件库按需后续安装 |
| API 客户端 | 原生 `fetch` + 手写 GraphQL        | 见 ADR-0002                           |
| 包管理器   | pnpm                               | 已就绪（v10.33.3）                    |

---

## 数据模型

### 基础 TypeScript 类型（`src/lib/shopify/types.ts`）

Phase 0 只定义当前用到的字段，后续阶段渐进扩展：

```typescript
interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

interface ProductImage {
  url: string;
  altText: string | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  priceRange: { minVariantPrice: MoneyV2 };
  featuredImage: ProductImage | null;
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
}
```

---

## API 契约

### Shopify Storefront API 客户端（`src/lib/shopify/client.ts`）

统一入口函数签名：

```typescript
export async function shopifyFetch<T>({
  query,
  variables,
  cache = "force-cache",
  tags,
}: {
  query: string;
  variables?: Record<string, unknown>;
  cache?: RequestCache;
  tags?: string[];
}): Promise<T>;
```

实现细节：

- Endpoint：`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`
- Headers：
  - `Content-Type: application/json`
  - `X-Shopify-Storefront-Access-Token: ${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN}`
- Method：`POST`
- Next.js `fetch` options：`{ cache, next: { tags } }`
- 错误处理：检查 HTTP 状态码和 `data.errors` 字段，服务端直接 throw

### GraphQL API 版本

使用 `2024-10`（Shopify 稳定版），后续升级时更新此处。

### 首个查询（`src/lib/shopify/queries/product.ts`）

```graphql
query GetProducts($first: Int!) {
  products(first: $first) {
    nodes {
      id
      title
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      featuredImage {
        url
        altText
      }
    }
  }
}
```

---

## 实施阶段

| 阶段 | 内容                      | 关键文件                                                      |
| ---- | ------------------------- | ------------------------------------------------------------- |
| 1    | 初始化 Next.js + Tailwind | `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/` |
| 2    | 集成 shadcn/ui            | `components.json`, `src/app/globals.css`                      |
| 3    | Shopify API 客户端        | `src/lib/shopify/client.ts`                                   |
| 4    | 基础类型定义              | `src/lib/shopify/types.ts`                                    |
| 5    | 首个 GraphQL 查询         | `src/lib/shopify/queries/product.ts`                          |
| 6    | 更新首页                  | `src/app/page.tsx`                                            |
| 7    | 环境变量文档化            | `.env.local`, `.env.example`                                  |

---

## 环境变量

| 变量名                            | 说明                               | 示例                       |
| --------------------------------- | ---------------------------------- | -------------------------- |
| `SHOPIFY_STORE_DOMAIN`            | 店铺域名（无 https://）            | `your-store.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Storefront API Public Access Token | `shpat_xxxxxxxx`           |

> 注：现有 `.env.local` 中的 `SHOPIFY_STORE_CLIENT_ID` / `SHOPIFY_STORE_SECRET` 为旧占位符，Phase 0 实施时替换为以上正确变量名。

---

## 测试计划

Phase 0 定位基础搭建，测试以手动验证为主：

| 测试项     | 方式                                  |
| ---------- | ------------------------------------- |
| 项目启动   | `pnpm dev`，浏览器访问 localhost:3000 |
| API 连通性 | 首页显示真实 Shopify 商品数据         |
| 类型正确性 | `pnpm typecheck`                      |
| 代码规范   | `pnpm lint`                           |

单元测试：Phase 0 暂不编写（`shopifyFetch` 的错误处理单元测试在 Phase 1 补充）。
