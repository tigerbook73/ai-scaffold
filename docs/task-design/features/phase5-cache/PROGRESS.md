# Phase 5 进度记录 — 缓存策略

## 状态：✅ 实现完成（待验收）

## 交付物清单

### 文档层

- [x] `docs/features/phase5-cache/REQUIREMENTS.md`
- [x] `docs/features/phase5-cache/DESIGN.md`
- [x] `docs/features/phase5-cache/PROGRESS.md`

### 缓存基础设施

- [x] `src/lib/shopify/cache-tags.ts` — 集中定义 tag 常量
- [x] `src/lib/shopify/client.ts` — 为商品/Collection 查询函数加 `next: { tags }` 参数；`getCart` 加可选 `tags` 参数

### Webhook 端点

- [x] `src/app/api/webhooks/shopify/route.ts` — HMAC 验证 + topic → revalidateTag 映射

### Phase 4 修复

- [x] `src/lib/actions/cart.ts` — `revalidatePath` → `revalidateTag(TAGS.cart, {})`
- [x] `src/components/cart/CartCount.tsx` — 传入 `[TAGS.cart]` tag，缓存购物车数量

## 验收标准

- [ ] 修改 Shopify 后台商品后，调用 `/api/webhooks/shopify` 可使商品页缓存失效
- [ ] 非法 HMAC 请求返回 401
- [ ] 购物车操作后 Header 数量正确更新（无需 `revalidatePath` 刷新整个路由树）
- [x] `lint` 无报错
- [x] TypeScript 编译无错误

## 备注

- 此版本 Next.js（16.2.6）中 `revalidateTag` 类型签名为 `(tag: string, profile: string | CacheLifeConfig) => undefined`，第二个参数必填。用 `{}` 表示空 `CacheLifeConfig`，效果等同于标准的单参数调用
- Shopify 后台 Webhook 配置为文档指引，不写自动化脚本
