# Phase 3 进度记录 — 搜索与 Streaming

## 状态：✅ 已完成（2026-05）

## 交付物清单

### 数据层

- [x] `src/lib/shopify/queries/search.ts` — SEARCH_QUERY
- [x] `src/lib/shopify/types.ts` — SearchResultItem / SearchResult 类型
- [x] `src/lib/shopify/client.ts` — searchProducts() 函数

### 组件层

- [x] `src/components/layout/Header.tsx` — 全局 Header
- [x] `src/components/search/SearchBox.tsx` — 搜索框（Client Component）
- [x] `src/components/search/SearchResults.tsx` — 结果列表（async RSC）
- [x] `src/components/search/SearchResultsSkeleton.tsx` — 骨架屏

### 路由层

- [x] `src/app/layout.tsx` — 插入 Header
- [x] `src/app/search/page.tsx` — 搜索页（Suspense 边界）
- [x] `src/app/search/loading.tsx` — 路由级 loading

## 验收标准

- [x] Header 在所有页面显示，导航链接可用
- [x] 搜索框提交后跳转 `/search?q=xxx`，关键词回显
- [x] 搜索结果页先显示骨架屏，再流式替换为真实内容
- [x] 空查询显示引导文案，无结果显示提示
- [x] `pnpm lint` 无报错
- [x] TypeScript 编译无错误

## 备注

Shopify `search` 的 `SearchType` 枚举不含 `COLLECTION`，仅支持 `PRODUCT`、`PAGE`、`ARTICLE`。
Collection 搜索需用 `predictiveSearch`，已记录在 DESIGN.md，留作后续扩展。

## 已知约束

- 搜索结果限 20 条，无分页（Phase 3 范围）
- 仅支持 Product + Collection，不包含 Article
- 无预测搜索（predictiveSearch 留作后续扩展）
