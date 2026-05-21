# Phase 3 设计文档 — 搜索与 Streaming

## 架构总览

```
src/
├── app/
│   ├── layout.tsx                      ← 插入 Header
│   └── search/
│       ├── page.tsx                    ← 搜索结果页（Suspense 边界）
│       └── loading.tsx                 ← 路由级 loading（全页骨架）
├── components/
│   ├── layout/
│   │   └── Header.tsx                  ← 新建：全局导航 + SearchBox
│   └── search/
│       ├── SearchBox.tsx               ← 新建：Client Component
│       ├── SearchResults.tsx           ← 新建：async RSC（Suspense 内容）
│       └── SearchResultsSkeleton.tsx   ← 新建：Suspense fallback
└── lib/shopify/
    ├── queries/search.ts               ← 新建：SEARCH_QUERY
    ├── types.ts                        ← 修改：新增 SearchResultItem / SearchResult
    └── client.ts                       ← 修改：新增 searchProducts()
```

## Streaming 设计（核心）

```
用户访问 /search?q=shirt
        ↓
SearchPage（Server Component，立即返回）
  ├── Header（已渲染）
  ├── <h1>Search results for "shirt"</h1>（已渲染）
  └── <Suspense fallback={<SearchResultsSkeleton />}>
          ↓ 异步流式填充
        <SearchResults query="shirt" />  ← 慢速 fetch 在此
      </Suspense>
```

**关键点：**

- `SearchPage` 本身不 `await` 任何数据，立即向客户端发送 HTML 框架
- `SearchResults` 是独立的 async RSC，其 `fetch` 完成后通过 HTTP 流式传输插入 DOM
- `SearchResultsSkeleton` 是纯 UI，占位直到真实内容到达
- `loading.tsx` 仅在路由切换时生效（React 的路由 loading 边界）

## GraphQL 查询设计

```graphql
query Search($query: String!, $first: Int!) {
  search(query: $query, first: $first, types: [PRODUCT]) {
    totalCount
    nodes {
      __typename
      ... on Product {
        ...ProductCard # 复用现有 Fragment
      }
    }
  }
}
```

> **注意：** Shopify `search` 的 `SearchType` 枚举只支持 `PRODUCT`、`PAGE`、`ARTICLE`，不含 `COLLECTION`。Collection 搜索需用 `predictiveSearch`（Phase 3 范围外）。

**GraphQL 新概念（Phase 3 学习重点）：**

| 概念             | 体现                                    |
| ---------------- | --------------------------------------- |
| Input Types      | `types: [PRODUCT]` — 枚举值列表作为参数 |
| Inline Fragments | `... on Product { }` — 类型条件字段选择 |
| `__typename`     | 查询返回类型名，为后续 Union 扩展保留   |

## 类型设计

```typescript
// types.ts 新增
export type SearchResultItem = (Product & { __typename: "Product" }) | (Collection & { __typename: "Collection" });

export interface SearchResult {
  totalCount: number;
  nodes: SearchResultItem[];
}
```

TypeScript 的 discriminated union 与 GraphQL Union Types 自然对应。

## 组件职责

### Header（Server Component）

- 读取 `NEXT_PUBLIC_SITE_URL` 或直接硬编码站名
- 导航链接：`/products`、`/collections`
- 内嵌 `<SearchBox />` Client Component

### SearchBox（Client Component，`'use client'`）

- 使用 `<form method="get" action="/search">` 原生 HTML form
- `<input name="q">` 触发 GET 请求，自动拼接 URL 参数
- `defaultValue` 接收当前搜索词（用于回显）
- 纯 HTML form submit，无需 `useRouter`，渐进增强友好

### SearchResults（async RSC）

- 接收 `query: string` prop
- 调用 `searchProducts(query)`
- 按 `__typename` 分发到 `ProductCard` 或 `CollectionCard`
- 处理空结果状态

### SearchResultsSkeleton

- 纯 UI 组件，模拟结果网格的灰色占位块
- 用于 Suspense `fallback`

## 缓存策略

```typescript
// searchProducts() 中
cache: "no-store"; // 搜索结果实时，不缓存
```

其他查询（商品、系列）维持 `force-cache` 默认不变。

## URL 结构

```
/search          → 显示搜索引导页（空状态）
/search?q=shirt  → 搜索 "shirt"，显示结果
/search?q=       → 等同于空状态
```
