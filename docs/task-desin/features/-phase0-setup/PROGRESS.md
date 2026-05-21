# Phase 0 — 基础搭建 进度追踪

## 当前阶段

**已完成** ✅ — 2026-05-15

---

## 上次确认提交

待提交（所有验收标准已通过）

---

## 已完成事项

- [x] 阶段 1：初始化 Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- [x] 阶段 2：集成 shadcn/ui（style: base-nova, base color: neutral）
- [x] 阶段 3：创建 `src/lib/shopify/client.ts`（`shopifyFetch<T>()`）
- [x] 阶段 4：创建 `src/lib/shopify/types.ts`（Product / Collection / Cart 类型骨架）
- [x] 阶段 5：创建 `src/lib/shopify/queries/product.ts`（`GET_PRODUCTS_QUERY`）
- [x] 阶段 6：更新 `src/app/page.tsx`（展示 Shopify 商品列表，含错误处理）
- [x] 阶段 7：更新 `.env.local` 变量名 + 创建 `.env.example`
- [x] `pnpm typecheck` 通过
- [x] `pnpm lint` 通过
- [x] 浏览器验证：首页显示真实 Shopify 商品数据（Gift Card、Snowboard 系列等）

---

## 验收标准完成情况

| ID   | 标准                                         | 状态 |
| ---- | -------------------------------------------- | ---- |
| AC-1 | `pnpm dev` 启动无报错                        | ✅   |
| AC-2 | 首页显示来自 Shopify 的真实商品名称          | ✅   |
| AC-3 | `pnpm lint` 通过                             | ✅   |
| AC-4 | `pnpm typecheck` 通过                        | ✅   |
| AC-5 | `.env.local` 使用正确的变量名（`SHOPIFY_*`） | ✅   |
| AC-6 | `.env.example` 存在且说明了所有必要变量      | ✅   |

---

## 已知偏差

| 偏差                                   | 说明                                                              | 处置                                                                            |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/utils.ts` vs `src/lib/utils/` | shadcn/ui 标准约定为顶层文件，所有 shadcn 组件从此路径导入 `cn()` | 接受：保留 `utils.ts` 给 shadcn，项目自定义工具函数后续放 `src/lib/utils/` 目录 |

---

## 下一步入口

Phase 1 — 商品浏览（RSC + 动态路由）：

- `/products` 商品列表页（RSC，服务端 fetch）
- `/products/[handle]` 商品详情页（动态路由 + Variant 选择）
- `generateStaticParams` 预渲染已知商品
- `next/image` 展示商品主图
