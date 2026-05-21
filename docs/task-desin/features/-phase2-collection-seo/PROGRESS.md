# Phase 2 — Collection 导航与 SEO 进度追踪

## 当前阶段

**进行中** 🚧 — 2026-05-16

---

## 上次确认提交

（尚未有提交）

---

## 已完成事项

- [x] REQUIREMENTS.md 起草完成
- [x] DESIGN.md 起草完成
- [x] 阶段 1：类型扩展（SEO interface、Collection 扩展、CollectionDetail、ProductDetail.seo）
- [x] 阶段 2：GraphQL 查询层（product 导出 fragment + seo，新建 collection.ts，新建 shop.ts）
- [x] 阶段 3：API 客户端层（getCollections、getCollectionByHandle、getProductHandles、getCollectionHandles、getShop）
- [x] 阶段 4：Collection 页面（CollectionCard 组件 + /collections + /collections/[handle]）
- [x] 阶段 5：全站 SEO（layout.tsx + products/page + products/[handle]/page）
- [x] 阶段 6：Sitemap（sitemap.ts）
- [ ] 阶段 7：验收（lint + typecheck + 浏览器测试 + build）

---

## 验收标准完成情况

| ID    | 标准                                 | 状态 |
| ----- | ------------------------------------ | ---- |
| AC-1  | `/collections` 展示系列卡片网格      | ⏳   |
| AC-2  | 系列卡片点击跳转详情                 | ⏳   |
| AC-3  | `/collections/[handle]` 展示系列商品 | ⏳   |
| AC-4  | cursor 分页，URL 追加 after 参数     | ⏳   |
| AC-5  | 无效 handle 返回 404                 | ⏳   |
| AC-6  | `<title>` 格式为 `页面 \| 店铺名`    | ⏳   |
| AC-7  | 商品详情页 og:image 标签             | ⏳   |
| AC-8  | `/sitemap.xml` 返回合法 XML          | ⏳   |
| AC-9  | `pnpm build` 预生成路由              | ⏳   |
| AC-10 | lint + typecheck 通过                | ⏳   |

---

## 已知偏差

（暂无）

---

## 下一步入口

Phase 3 — 搜索与 Streaming
