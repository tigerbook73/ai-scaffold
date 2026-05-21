# Phase 3 需求文档 — 搜索与 Streaming

## 目标

实现全站搜索功能，并通过 Streaming + Suspense 实践 Next.js 渐进渲染能力。

## 功能需求

### F1 — 搜索入口（SearchBox）

- 全局 Header 中常驻搜索框
- 用户输入关键词并提交后，跳转至 `/search?q=<keyword>`
- 搜索框在搜索结果页回显当前关键词
- 支持回车或点击搜索按钮触发

### F2 — 搜索结果页（`/search?q=xxx`）

- URL 参数 `q` 驱动搜索，无客户端状态
- 搜索范围：商品（Product）+ 系列（Collection）
- 结果展示：
  - 商品使用现有 `ProductCard` 组件
  - 系列使用现有 `CollectionCard` 组件
  - 混排展示，按相关性排序（Shopify 默认）
- 显示匹配总数（`totalCount`）
- 无结果时显示引导文案
- 搜索词为空时显示提示，不发起请求

### F3 — Streaming 渐进渲染

- 页面框架（标题、搜索框）立即渲染，不等数据
- 搜索结果区先显示骨架屏（Skeleton），数据就绪后流式替换
- 路由切换时（从其他页面跳转到搜索页）显示全页 loading 状态

### F4 — 全局 Header

- 包含：站名/Logo + 导航链接（Products / Collections）+ SearchBox
- 在所有页面顶部展示

## 非功能需求

- 搜索结果不缓存（`cache: 'no-store'`），每次请求都是实时数据
- 无客户端状态库，所有状态通过 URL 参数传递
- TypeScript 严格模式，无 `any`

## 不在本阶段范围内

- 搜索结果分页（Phase 3 只做首页结果，`first: 20`）
- 预测搜索 / 自动补全（`predictiveSearch` API）
- 搜索历史记录
- 按类型过滤（Product only / Collection only）
