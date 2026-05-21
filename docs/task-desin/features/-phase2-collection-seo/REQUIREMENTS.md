# Phase 2 — Collection 导航与 SEO 需求文档

## 产品目标

在 Phase 1 商品浏览的基础上，完善分类导航体系，并为全站添加 SEO 支持，使商品和系列页面可被搜索引擎和社交平台正确识别。

---

## 用例

| ID   | 用例                                | 角色     |
| ---- | ----------------------------------- | -------- |
| UC-1 | 浏览所有商品系列                    | 访客     |
| UC-2 | 进入某系列查看其商品列表            | 访客     |
| UC-3 | 在系列商品页翻页                    | 访客     |
| UC-4 | 分享商品链接到社交平台并展示预览图  | 访客     |
| UC-5 | 搜索引擎抓取 sitemap 索引商品和系列 | 搜索引擎 |

---

## 业务规则

- Collection 来源于 Shopify 后台，前端只读取，不创建
- 每个 Collection 有唯一 `handle`，作为 URL 路径段
- Collection 商品页每页展示 12 条，通过 cursor 翻页
- SEO 标题优先使用 Shopify 后台设置的 `seo.title`，fallback 到 `title`
- OG 图片使用商品或系列的 `featuredImage`
- Sitemap 包含首页、商品列表页、系列列表页、所有商品详情页、所有系列详情页

---

## 验收标准

| ID    | 标准                                                     |
| ----- | -------------------------------------------------------- | ------- |
| AC-1  | `/collections` 展示系列卡片网格                          |
| AC-2  | 系列卡片点击跳转 `/collections/[handle]`                 |
| AC-3  | `/collections/[handle]` 展示该系列所有商品（每页 12 条） |
| AC-4  | 有下一页时，URL 追加 `?after=cursor` 实现翻页            |
| AC-5  | 无效 handle 返回 404                                     |
| AC-6  | `<title>` 标签格式为 `页面标题                           | 店铺名` |
| AC-7  | 商品详情页 `<head>` 包含 `og:image` 标签                 |
| AC-8  | `/sitemap.xml` 返回包含商品和系列 URL 的合法 XML         |
| AC-9  | `pnpm build` 预生成系列路由，无构建错误                  |
| AC-10 | lint + typecheck 通过                                    |
