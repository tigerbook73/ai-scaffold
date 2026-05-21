# Phase 1 — 商品浏览 进度追踪

## 当前阶段

**已完成** ✅ — 2026-05-16

---

## 上次确认提交

`f315706` — phase1/products: 实现商品列表页与商品详情页

---

## 已完成事项

- [x] REQUIREMENTS.md 起草完成
- [x] DESIGN.md 起草完成
- [x] 阶段 1：扩展类型定义（`ProductVariant`、`ProductDetail`）
- [x] 阶段 2：新增 GraphQL 查询 + API 函数
- [x] 阶段 3：配置 next.config.ts 图片域名
- [x] 阶段 4：实现 `ProductCard` 组件
- [x] 阶段 5：实现 `/products` 列表页
- [x] 阶段 6：实现 `VariantSelector` 组件
- [x] 阶段 7：实现 `/products/[handle]` 详情页
- [x] 阶段 8：验收（lint + typecheck + 浏览器测试）

---

## 验收标准完成情况

| ID   | 标准                         | 状态 |
| ---- | ---------------------------- | ---- |
| AC-1 | `/products` 展示商品卡片网格 | ✅   |
| AC-2 | 商品卡片可导航至详情页       | ✅   |
| AC-3 | 详情页展示主图、标题、价格   | ✅   |
| AC-4 | Variant 选择器切换后价格更新 | ✅   |
| AC-5 | 无效 handle 返回 404         | ✅   |
| AC-6 | `pnpm build` 预生成商品路由  | ✅   |
| AC-7 | lint + typecheck 通过        | ✅   |

---

## 已知偏差

（暂无）

---

## 下一步入口

Phase 2 — Collection 导航与 SEO：

- `/collections` 系列列表页
- `/collections/[handle]` 系列商品页（分页）
- 全站 `generateMetadata`
- `sitemap.ts`
