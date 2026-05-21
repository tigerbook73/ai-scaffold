# Phase 0 — 基础搭建 需求文档

## 产品目标

搭建可运行的项目骨架，验证 Shopify Storefront API 连通性，为后续所有阶段的功能开发奠定基础。

---

## 用例

### UC-1：项目可本地运行

**参与者**：开发者  
**前置条件**：已安装 Node.js 22+ 和 pnpm 10+  
**场景**：执行 `pnpm dev` 后，浏览器可访问 `http://localhost:3000`，页面正常渲染。

### UC-2：Shopify API 连通验证

**参与者**：开发者  
**前置条件**：`.env.local` 中填入了真实的 `SHOPIFY_STORE_DOMAIN` 和 `SHOPIFY_STOREFRONT_ACCESS_TOKEN`  
**场景**：访问首页，页面显示来自 Shopify 的真实商品名称和价格，证明 API 链路通畅。

### UC-3：环境变量文档化

**参与者**：开发者 / AI 工具  
**场景**：通过 `.env.example` 明确知道项目需要配置哪些变量，无需阅读代码。

---

## 业务规则

| 规则 | 说明                                                               |
| ---- | ------------------------------------------------------------------ |
| BR-1 | 只使用 Shopify Storefront API，不使用 Admin API（见 ADR-0001）     |
| BR-2 | API 客户端必须封装为 `shopifyFetch<T>()` 统一入口（见 graphql.md） |
| BR-3 | Storefront Access Token 只在服务端使用，不暴露到客户端             |
| BR-4 | 首页只做连通性验证，不实现完整商品浏览 UI（Phase 1 负责）          |

---

## 验收标准

| ID   | 标准                                         | 验证方式                  |
| ---- | -------------------------------------------- | ------------------------- |
| AC-1 | `pnpm dev` 启动无报错                        | 终端无 Error 输出         |
| AC-2 | 首页显示来自 Shopify 的真实商品名称          | 浏览器访问 localhost:3000 |
| AC-3 | `pnpm lint` 通过                             | 终端无 lint 错误          |
| AC-4 | TypeScript 无类型错误                        | `pnpm typecheck` 通过     |
| AC-5 | `.env.local` 使用正确的变量名（`SHOPIFY_*`） | 代码检查                  |
| AC-6 | `.env.example` 存在且说明了所有必要变量      | 文件存在检查              |
