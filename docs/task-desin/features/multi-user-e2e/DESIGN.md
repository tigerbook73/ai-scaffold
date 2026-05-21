# multi-user-e2e 设计

## 1. 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

---

## 2. 现状

- Playwright 配置已存在（`playwright.config.ts`）。
- `e2e/basic.test.ts` 覆盖登录页默认账号展示，共 2 个测试。
- Seed 账号（`admin@test.com` / `user1@test.com` / `user2@test.com`）已由 `scripts/seed-users.ts` 初始化。
- 涉及检索的场景需要 Supabase Auth + PostgreSQL + pgvector，无法在纯 mock 环境下运行。

---

## 3. 测试分类

按依赖程度分两类：

| 类型             | 场景                                        | 运行条件                             |
| ---------------- | ------------------------------------------- | ------------------------------------ |
| **UI 权限测试**  | 会话隔离、文档列表隔离、Admin 操作、UI 入口 | 需要 Supabase Auth + DB              |
| **检索权限测试** | 公开文档勾选前后的问答内容变化              | 需要 Supabase Auth + DB + 已索引文档 |

检索权限测试中，为避免依赖真实 LLM，使用预置的特征性关键词文档（如只包含唯一字符串的 txt 文件），断言回答中是否出现该字符串，而不验证答案质量。

---

## 4. 测试文件结构

```
e2e/
  basic.test.ts          ← 已有，保持不动
  fixtures/
    auth.ts              ← 登录 helper（复用账号 cookies）
    documents.ts         ← 上传/设置可见性/删除文档 helper
  multi-user/
    session-isolation.test.ts
    document-isolation.test.ts
    public-doc-selection.test.ts
    admin-operations.test.ts
```

---

## 5. Fixture 设计

### 5.1 `auth.ts`

提供三个已登录浏览器上下文，避免每个测试重复登录：

```ts
// storageState 缓存登录 cookie，避免重复走 Supabase Auth 流程
export const test = base.extend<{
  adminPage: Page;
  user1Page: Page;
  user2Page: Page;
}>({ ... });
```

各账号的登录状态存入 `e2e/.auth/{admin,user1,user2}.json`，在 `globalSetup` 中一次性生成。

### 5.2 `documents.ts`

提供上传、设置可见性、删除文档的 API helper（通过 fetch 调用已有 API），在测试 `beforeEach` / `afterEach` 中管理测试数据。

---

## 6. 各测试文件设计要点

### 6.1 `session-isolation.test.ts`

- `user1` 通过 UI 创建聊天，读取 URL 中的 session id。
- 断言该 session id 不出现在 `user2` 的聊天列表。
- `user2` 直接导航到该 URL，断言页面显示为空或跳转。

### 6.2 `document-isolation.test.ts`

- `user1` 通过 API fixture 上传私有文档。
- 断言 `user2` 的文档列表 API 不返回该文档。
- `user2` 调用 DELETE API 删除该文档，断言返回 404 或 403。

### 6.3 `public-doc-selection.test.ts`

- `user1` 上传包含唯一关键词（如 `TESTKEY_XYZABC`）的 txt 文档并设为 public，等待索引完成。
- 断言 `user2` 的公开文档列表中包含该文档。
- `user2` 未勾选时提问，断言回答不含 `TESTKEY_XYZABC`。
- `user2` 勾选后提问，断言回答含 `TESTKEY_XYZABC`。
- `user2` 取消勾选后提问，断言回答不含 `TESTKEY_XYZABC`。
- 索引等待用轮询 `GET /api/documents/{id}` 状态，超时 60 秒。

### 6.4 `admin-operations.test.ts`

- Admin 页面用户列表包含 user1 和 user2。
- Admin 删除 user2 后，user2 再次登录得到错误（重新使用 Supabase signIn 断言失败或 403）。
- Admin 页面删除自己的按钮不可用或点击后返回错误提示。
- Admin 删除 user1 某个公开文档后，user2 公开列表中不再出现该文档。

---

## 7. 测试数据隔离策略

- 每个测试文件使用独立的文档名前缀（如 `e2e-isolation-{uuid}`）避免互相干扰。
- `afterEach` / `afterAll` 清理测试上传的文档（admin 账号删除）。
- 不清理测试创建的聊天记录（数量小，不影响其他测试）。
- Admin 账号本身不在测试中被删除。

---

## 8. 实施阶段

### 阶段 1：globalSetup 和 auth fixtures

- 新增 `e2e/global-setup.ts`，为三个账号生成登录 storageState。
- 新增 `e2e/fixtures/auth.ts`，暴露 `adminPage`、`user1Page`、`user2Page`。
- 验证：`pnpm exec playwright test --project=chromium` 能正常加载三个账号的已登录状态。

### 阶段 2：会话隔离和文档隔离测试

- 新增 `e2e/fixtures/documents.ts`。
- 新增 `session-isolation.test.ts` 和 `document-isolation.test.ts`。
- 验证：上述两个文件的测试稳定通过。

### 阶段 3：公开文档选择测试

- 新增 `public-doc-selection.test.ts`（包含索引等待逻辑）。
- 验证：使用唯一关键词文档，勾选前后回答内容变化符合预期。

### 阶段 4：Admin 操作测试

- 新增 `admin-operations.test.ts`。
- 验证：删除用户、文档、自删保护逻辑均测试通过。

---

## 9. 风险和注意事项

- 阶段 3 的检索测试依赖索引完成，CI 中需要保证 Supabase + DB 可用，否则跳过该文件。
- `user2` 删除测试会修改 Auth 状态，需要在 `afterAll` 重建 user2（调用 admin API 重新创建）。
- Playwright storageState 只保存 cookie，不保存应用状态；每个测试需要自行设置前置数据。
- 避免测试之间的执行顺序依赖，每个 test 应自包含前置数据准备。
