## 2. Multi-user Design

### 2.1 目录

- [2. Multi-user Design](#2-multi-user-design)
  - [2.1 目录](#21-目录)
  - [2.2 对应需求](#22-对应需求)
  - [2.3 当前系统现状](#23-当前系统现状)
  - [2.4 设计原则](#24-设计原则)
  - [2.5 数据模型设计](#25-数据模型设计)
    - [2.5.1 新增用户资料](#251-新增用户资料)
    - [2.5.2 修改聊天模型](#252-修改聊天模型)
    - [2.5.3 修改文档模型](#253-修改文档模型)
    - [2.5.4 新增公开文档选择关系](#254-新增公开文档选择关系)
  - [2.6 认证和授权设计](#26-认证和授权设计)
  - [2.7 数据访问层设计](#27-数据访问层设计)
    - [2.7.1 目标](#271-目标)
    - [2.7.2 建议目录](#272-建议目录)
    - [2.7.3 调用规则](#273-调用规则)
    - [2.7.4 例外和边界](#274-例外和边界)
  - [2.8 API 设计](#28-api-设计)
    - [2.8.1 会话 API](#281-会话-api)
    - [2.8.2 文档 API](#282-文档-api)
    - [2.8.3 文档可见性 API](#283-文档可见性-api)
    - [2.8.4 公开文档选择 API](#284-公开文档选择-api)
    - [2.8.5 管理员 API](#285-管理员-api)
  - [2.9 检索设计](#29-检索设计)
  - [2.10 删除清理设计](#210-删除清理设计)
    - [2.10.1 删除文档](#2101-删除文档)
    - [2.10.2 删除用户](#2102-删除用户)
  - [2.11 默认账号初始化](#211-默认账号初始化)
  - [2.12 页面和组件设计](#212-页面和组件设计)
    - [2.12.1 登录页](#2121-登录页)
    - [2.12.2 Knowledge 页面](#2122-knowledge-页面)
    - [2.12.3 Admin 用户管理](#2123-admin-用户管理)
  - [2.13 迁移策略](#213-迁移策略)
  - [2.14 实施顺序](#214-实施顺序)
  - [2.15 测试策略](#215-测试策略)
    - [2.15.1 单元/接口测试](#2151-单元接口测试)
    - [2.15.2 E2E 验收](#2152-e2e-验收)
  - [2.16 风险和注意事项](#216-风险和注意事项)
  - [2.17 生产发布策略](#217-生产发布策略)

### 2.2 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

目标是在现有 Supabase Auth 登录能力基础上，为聊天、文档、公开文档选择、问答检索和管理员操作增加明确的用户边界。

### 2.3 当前系统现状

- Supabase Auth 已接入，`src/proxy.ts` 会拦截未登录用户。
- 登录页已使用 Supabase `signInWithPassword`。
- 业务数据库目前没有用户资料表，也没有角色字段。
- `Session` 和 `Document` 都没有用户归属字段，当前所有聊天和文档都是全局共享。
- 文档 `contentHash` 当前全局唯一，不满足“不同用户允许上传内容相同的文件”。
- 文档检索 SQL 只过滤 `documents.status = 'indexed'`，没有按当前用户权限限制检索范围。
- 文档上传、删除、重建索引、会话读写等 API 当前都没有业务级资源授权。

### 2.4 设计原则

- 以后端权限校验为准，前端只负责展示和交互。
- 所有聊天、文档、检索 API 都必须从当前登录用户推导权限范围。
- 普通用户的数据访问默认只限本人资源。
- 管理员能力只扩展到用户管理和全站文档管理，不扩展到查看他人聊天内容。
- 删除用户或文档时，数据库记录、索引、文件和公开文档选择关系必须一起清理。
- 需求文档保持产品规则，本文档记录实现设计和落地步骤。

### 2.5 数据模型设计

#### 2.5.1 新增用户资料

新增业务用户资料表，用来承接 Supabase Auth 用户和业务角色。

建议模型：

```prisma
enum UserRole {
  user
  admin
}

model UserProfile {
  id        String   @id
  email     String   @unique
  role      UserRole @default(user)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  documents Document[]
  sessions  Session[]
  publicDocumentSelections PublicDocumentSelection[]

  @@map("user_profiles")
}
```

说明：

- `id` 使用 Supabase Auth user id。
- 角色以业务表为准，不依赖前端状态。
- 默认账号由 seed 或初始化脚本创建 Supabase Auth 用户，并同步写入 `UserProfile`。

#### 2.5.2 修改聊天模型

`Session` 增加 `userId`，所有查询和写入都按当前用户过滤。

建议变更：

```prisma
model Session {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  title     String           @default("New Chat")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")
  user      UserProfile      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  SessionMessage[]

  @@index([userId, updatedAt])
  @@map("sessions")
}
```

`SessionMessage` 继续通过 `Session` 级联删除即可。

#### 2.5.3 修改文档模型

`Document` 增加上传者和可见性。

建议模型：

```prisma
enum DocumentVisibility {
  private
  public
}

model Document {
  id          String             @id @default(uuid())
  ownerUserId String             @map("owner_user_id")
  name        String
  mime        String
  contentHash String             @map("content_hash")
  visibility  DocumentVisibility @default(private)
  lang        String             @default("unknown")
  sizeBytes   Int                @map("size_bytes")
  status      String             @default("pending")
  errorMsg    String?            @map("error_msg")
  totalChunks Int?               @map("total_chunks")
  fileRef     String?            @map("file_path")
  createdAt   DateTime           @default(now()) @map("created_at")

  owner       UserProfile        @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  chunks      Chunk[]
  selections  PublicDocumentSelection[]

  @@unique([ownerUserId, contentHash])
  @@index([ownerUserId, createdAt])
  @@index([visibility, status])
  @@map("documents")
}
```

说明：

- 移除 `contentHash` 的全局唯一约束，改为 `(ownerUserId, contentHash)` 唯一。
- 同一用户重复上传同内容仍返回重复错误。
- 不同用户上传同内容允许创建各自的文档和索引。

#### 2.5.4 新增公开文档选择关系

```prisma
model PublicDocumentSelection {
  id         String      @id @default(uuid())
  userId     String      @map("user_id")
  documentId String      @map("document_id")
  createdAt  DateTime    @default(now()) @map("created_at")

  user       UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  document   Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([userId, documentId])
  @@index([documentId])
  @@map("public_document_selections")
}
```

约束规则：

- 只能选择其他用户的 `public` 文档。
- 不能选择自己的文档，因为自己的文档天然参与自己的可用范围。
- 不能选择未索引完成、索引失败或已删除文档。

### 2.6 认证和授权设计

新增服务端 helper，集中处理当前用户和角色判断。

建议文件：

- `src/lib/auth/get-current-user.ts`
- `src/lib/auth/require-user.ts`
- `src/lib/auth/require-admin.ts`

职责：

- 从 Supabase server client 获取当前 auth user。
- 用 auth user id 查询 `UserProfile`。
- 未登录返回 401。
- 缺少业务用户资料返回 403 或执行受控补齐。
- 管理员接口通过 `requireAdmin()` 校验角色。

所有 API route 和 server page 不直接相信前端传入的 user id。

### 2.7 数据访问层设计

#### 2.7.1 目标

多用户改造后，数据库访问需要按领域收敛，避免 Prisma 查询散落在 Server Component、API route 和组件附近。

核心目标：

- 权限过滤在统一位置实现，减少遗漏 `userId` 条件导致的数据泄露。
- 页面和 API route 只负责获取当前用户、解析请求和返回响应。
- 数据查询函数显式接收 `userId`、`actor` 或 `role`，调用者不能隐式绕过权限边界。
- 跨资源流程放入 service 层，避免删除、索引、storage 清理等逻辑散落。

#### 2.7.2 建议目录

建议按领域建立数据访问层，而不是创建一个巨大的通用 `database.ts`。

```text
src/lib/data/
  sessions.ts
  documents.ts
  public-documents.ts
  users.ts

src/lib/services/
  delete-document.ts
  delete-user.ts
  indexing.ts
```

职责划分：

- `src/lib/data/*`：封装 Prisma 查询，负责单一领域的数据读取和简单写入。
- `src/lib/services/*`：封装跨资源业务流程，例如删除文档、删除用户、触发索引。
- `src/app/api/**`：只做 request parsing、auth helper 调用、data/service 调用和 response mapping。
- Server Component/page：不直接 import `prisma`，只调用 data 层函数。
- Client Component：不直接访问数据库，只通过 API route 或 server-rendered props 获取数据。

#### 2.7.3 调用规则

Server Component 中当前直接访问数据库的页面需要改造：

- `src/app/knowledge/page.tsx` 不再直接调用 `prisma.document.findMany`，改为调用 `listDocumentsForUser(userId)`。
- `src/app/chat/[id]/page.tsx` 不再直接调用 `prisma.session.findUnique`，改为调用 `getSessionForUser(userId, sessionId)`。

API route 中也不直接散写业务查询，改为调用 data/service 函数：

```ts
const actor = await requireUser();
const session = await getSessionForUser(actor.id, sessionId);
```

数据访问函数命名应体现权限范围：

- `getSessionForUser(userId, sessionId)`
- `listSessionsForUser(userId)`
- `listDocumentsForOwner(userId)`
- `listSelectablePublicDocuments(userId)`
- `listAdminDocuments(actor)`

不建议使用模糊函数名：

- `getSession(id)`
- `listDocuments()`
- `deleteDocument(id)`

这些名字容易隐藏权限条件。

#### 2.7.4 例外和边界

不是所有 Prisma 调用都必须集中到同一个文件。以下模块可以保留领域内数据库访问，但必须显式接收权限上下文：

- `src/lib/retrieval/*`：向量检索需要 raw SQL 和性能控制，可以保留在 retrieval 领域内，但 `retrieve()` / `vectorSearch()` 必须接收 `userId` 并在 SQL 中过滤。
- `src/lib/ingest/*`：索引流程可以保留文档状态和 chunk 写入逻辑，但文档创建和触发入口必须已经完成 owner 权限校验。
- admin service：可以访问跨用户数据，但入口必须先通过 `requireAdmin()`。

原则是：允许领域模块直接使用 Prisma，但不允许页面、组件和 API route 到处散写权限敏感查询。

### 2.8 API 设计

#### 2.8.1 会话 API

现有接口：

- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/[id]`
- `PATCH /api/sessions/[id]`
- `DELETE /api/sessions/[id]`

设计变更：

- `GET /api/sessions` 只返回当前用户的 sessions。
- `POST /api/sessions` 创建时写入当前用户 `userId`。
- `GET /api/sessions/[id]` 必须同时过滤 `id` 和当前用户 `userId`。
- `PATCH /api/sessions/[id]` 只能更新当前用户 session。
- 当前 PATCH 的 upsert 逻辑需要改造，避免用户通过自定义 ID 覆盖或创建不属于自己的 session。
- `DELETE /api/sessions/[id]` 只能删除当前用户 session。
- 管理员也不能通过这些普通会话 API 访问其他用户聊天。

#### 2.8.2 文档 API

现有接口：

- `GET /api/documents`
- `POST /api/documents/prepare`
- `DELETE /api/documents/[id]`
- `POST /api/documents/[id]/index`
- `POST /api/documents/[id]/reindex`

设计变更：

- `GET /api/documents` 默认只返回当前用户自己的文档。
- 支持查询不同视图：
  - `scope=mine`：自己的文档。
  - `scope=public`：其他用户公开且可选择的文档。
  - `scope=admin`：管理员查看全站文档。
- `POST /api/documents/prepare` 创建文档时写入当前用户 `ownerUserId` 和 `visibility`。
- 上传前重复检查改为 `(ownerUserId, contentHash)`。
- `DELETE /api/documents/[id]` 允许文档 owner 删除自己的文档，管理员可以删除任意文档。
- `POST /api/documents/[id]/index` 只允许文档 owner 或管理员触发。
- `POST /api/documents/[id]/reindex` 只允许文档 owner 或管理员触发。
- 文档删除需要同时删除 storage 文件；数据库 chunks 和选择关系通过级联删除。

#### 2.8.3 文档可见性 API

新增接口：

- `PATCH /api/documents/[id]`

请求：

```json
{ "visibility": "private" }
```

规则：

- 只有文档 owner 可以修改自己文档的可见性。
- 管理员是否允许替用户修改可见性，需求未要求，设计上不开放。
- 文档从 `public` 改为 `private` 后，其他用户对该文档的选择关系应删除或失效。建议直接删除选择关系，保持后续检索简单。

#### 2.8.4 公开文档选择 API

新增接口：

- `GET /api/public-documents`
- `POST /api/public-documents/[id]/selection`
- `DELETE /api/public-documents/[id]/selection`

规则：

- `GET` 返回其他用户 `public` 文档，并标记当前用户是否已选择。
- `POST` 只能选择其他用户的 `public` 且 `indexed` 文档。
- `DELETE` 取消当前用户对该文档的选择。
- 如果文档被删除或改为 private，选择关系自动删除或失效。

#### 2.8.5 管理员 API

新增接口：

- `GET /api/admin/users`
- `POST /api/admin/users`
- `DELETE /api/admin/users/[id]`
- `GET /api/admin/documents`
- `DELETE /api/admin/documents/[id]`

规则：

- 所有 `/api/admin/*` 都必须调用 `requireAdmin()`。
- 创建用户需要同时创建 Supabase Auth 用户和 `UserProfile`。
- 删除用户需要禁止删除自己。
- 删除用户需要删除 Supabase Auth 用户，并清理业务数据和 storage 文件。
- 管理员删除文档可以复用普通文档删除服务，但权限由 admin API 校验。

### 2.9 检索设计

当前 `vectorSearch(embedding, topK)` 只按 `d.status = 'indexed'` 过滤。需要改为按当前用户可用文档范围过滤。

建议函数签名：

```ts
retrieve(userQuery, { userId, traceId, provider });
vectorSearch(embedding, topK, userId);
```

可用文档 SQL 条件：

```sql
d.status = 'indexed'
AND (
  d.owner_user_id = $userId
  OR EXISTS (
    SELECT 1
    FROM public_document_selections s
    WHERE s.document_id = d.id
      AND s.user_id = $userId
  )
)
```

补充说明：

- 自己的 `private` 和 `public` 文档都通过 `owner_user_id = userId` 覆盖。
- 其他用户文档只有存在选择关系时才进入检索。
- 选择关系创建时已经保证只能选择其他用户 public indexed 文档。
- 为防御数据异常，检索 SQL 可以额外要求被选择文档仍为 `public`。

更防御的条件：

```sql
d.status = 'indexed'
AND (
  d.owner_user_id = $userId
  OR (
    d.visibility = 'public'
    AND EXISTS (
      SELECT 1
      FROM public_document_selections s
      WHERE s.document_id = d.id
        AND s.user_id = $userId
    )
  )
)
```

`POST /api/chat` 必须从服务端获取当前用户，并把 `userId` 传入 `retrieve()`。不能允许前端传入检索文档列表作为权限依据。

### 2.10 删除清理设计

#### 2.10.1 删除文档

建议提取服务函数：

- `src/lib/documents/delete-document.ts`

职责：

- 校验调用者是否为 owner 或 admin。
- 读取文档及 `fileRef`。
- 删除 storage 文件。
- 删除 document 记录。
- 依赖数据库级联删除 chunks 和 selections。

需要注意：

- storage 删除失败不应留下数据库记录永久不可删。建议记录日志，并继续删除数据库记录；后续可补清理脚本。
- 如果文档正在 indexing，`processDocument()` 现有 catch 已能处理文档删除后更新失败场景，但需要保留该容错。

#### 2.10.2 删除用户

建议提取服务函数：

- `src/lib/admin/delete-user.ts`

职责：

- 禁止管理员删除自己。
- 查询用户所有文档的 `fileRef`。
- 删除这些 storage 文件。
- 删除 Supabase Auth 用户。
- 删除 `UserProfile`，依赖级联删除 sessions、messages、documents、chunks、selections。

删除顺序建议：

1. 校验 admin 和目标用户。
2. 收集目标用户文档 file refs。
3. 删除 storage 文件。
4. 删除 Supabase Auth 用户。
5. 删除 `UserProfile`。

如果 Supabase Auth 删除成功但数据库删除失败，需要返回错误并保留日志；不引入审计日志，因为需求明确不支持。

### 2.11 默认账号初始化

需要新增脚本，例如：

- `scripts/seed-users.ts`

职责：

- 使用 Supabase service role 创建或更新三个默认用户。
- 同步创建或更新 `UserProfile`。
- 设置 `admin@test.com` 为 `admin`，其余为 `user`。

脚本需要幂等：

- 用户存在时不重复创建。
- 角色不一致时修正业务表角色。
- 密码是否重置需要明确。为了演示一致性，建议 seed 时可更新默认账号密码。

### 2.12 页面和组件设计

本节只描述功能入口，不展开视觉设计。

#### 2.12.1 登录页

- 保留默认账号提示。
- 默认填充 admin 账号可以继续保留，方便演示。

#### 2.12.2 Knowledge 页面

建议从一个全局文档列表改为三个功能区或标签：

- My Documents：当前用户自己的文档，支持上传、改可见性、删除、重建索引。
- Public Documents：其他用户公开文档，支持选择和取消选择。
- Admin Documents：仅管理员可见，全站文档列表，支持删除。

上传文档时需要增加可见性选择，默认 `private`。

#### 2.12.3 Admin 用户管理

可以新增独立页面：

- `/admin/users`

能力：

- 查看用户列表。
- 创建普通用户。
- 删除普通用户。
- 禁止删除自己。

导航入口仅管理员可见；后端仍必须校验管理员权限。

### 2.13 迁移策略

当前已有数据没有 owner。迁移需要为现有 sessions/documents 指定归属。

建议策略：

- 先创建默认 admin 用户。
- 新增字段时先允许 nullable。
- 将现有 sessions 和 documents 归属到 admin。
- 填充完成后把 `userId` / `ownerUserId` 改为 required。
- 移除 `Document.contentHash` 全局唯一约束，新增 `(ownerUserId, contentHash)` 唯一约束。

如果使用 Prisma migrate，一次迁移中涉及数据回填和约束调整时，建议检查生成 SQL，必要时手写 migration。

### 2.14 实施顺序

按可验证的垂直切片实施，避免一次性修改过大导致定位和回滚困难。每个阶段完成后应先验证再进入下一阶段。

#### 2.14.1 阶段一：数据模型和默认用户基础

目标：

- 增加用户资料、角色、文档可见性、公开文档选择关系。
- 将现有聊天和文档归属到默认管理员。
- 支持默认用户初始化。

改动范围：

- `prisma/schema.prisma`
- Prisma migration
- 默认用户 seed 脚本
- Prisma client 生成结果

临时兼容实现：

- 阶段一只完成数据模型和默认用户基础，尚未完成 `requireUser()`、数据访问层和业务 API 权限改造。
- 为了让阶段一完成后项目仍可编译、可运行、可执行基础验证，现有创建路径可以临时把新数据归属到默认 admin。
- 涉及路径：
  - `src/app/api/documents/prepare/route.ts`
  - `src/app/api/sessions/route.ts`
  - `src/app/api/sessions/[id]/route.ts`
  - `src/lib/ingest/pipeline.ts`
- 该兼容只服务于开发阶段验证，不是最终权限设计。
- 阶段二、三、四引入 `requireUser()` 和数据访问层后，session/document 创建必须使用当前登录用户。
- `ingest` CLI 如果后续仍保留，应明确为 admin-only/system-owned，或要求调用方显式传入 owner。
- 最终生产发布前，除 seed、migration 和明确的 admin/system 工具外，业务写入路径不得继续硬编码 `DEFAULT_ADMIN_USER_ID`。

自动化测试：

- 如果本地数据库可用，运行迁移和 seed，验证默认用户资料存在且角色正确。
- 增加 seed 幂等测试或脚本级 dry run 检查：重复执行不会重复创建业务用户资料。
- 增加迁移后数据校验脚本或测试：历史 sessions/documents 均有 owner。

人工验证：

- 查看数据库中 `admin@test.com`、`user1@test.com`、`user2@test.com` 的业务资料。
- 确认旧聊天和旧文档归属到 admin。
- 确认同一用户仍不能重复上传相同 hash 的文档，不同用户后续可支持相同 hash。

#### 2.14.2 阶段二：认证授权和数据访问层

目标：

- 增加 `requireUser()` / `requireAdmin()`。
- 建立 `src/lib/data/*` 和 `src/lib/services/*`。
- 移除 Server Component/page 中直接 Prisma 查询。

改动范围：

- `src/lib/auth/*`
- `src/lib/data/*`
- `src/lib/services/*`
- `src/app/knowledge/page.tsx`
- `src/app/chat/[id]/page.tsx`

自动化测试：

- 单元测试 `requireUser()`：未登录返回 401，缺少业务资料返回 403 或受控错误。
- 单元测试 `requireAdmin()`：普通用户不能通过，管理员可以通过。
- 静态检查或测试：`src/app/**/page.tsx` 不直接 import `@/lib/db/client`。
- TypeScript 检查：`pnpm exec tsc --noEmit`。

人工验证：

- 登录后打开 Chat 和 Knowledge 页面仍能正常渲染。
- 未登录访问受保护页面会跳转登录页。
- 直接访问不存在或无权限资源时不会暴露敏感数据。

#### 2.14.3 阶段三：聊天记录隔离

目标：

- 所有 session API 按当前用户隔离。
- 用户不能通过 URL 或 API 访问他人聊天。
- 管理员在普通聊天 API 中也只能访问自己的聊天。

改动范围：

- `src/lib/data/sessions.ts`
- `src/app/api/sessions/route.ts`
- `src/app/api/sessions/[id]/route.ts`
- `src/app/chat/[id]/page.tsx`
- `src/lib/session-api.ts` 如返回 shape 需要调整

自动化测试：

- API 测试：`user1` 创建 session 后，`user2` 的 `GET /api/sessions` 不包含该 session。
- API 测试：`user2` 对 `user1` session 的 GET/PATCH/DELETE 返回 404 或 403。
- API 测试：`PATCH /api/sessions/[id]` 不能通过自定义 ID 创建或覆盖他人 session。
- E2E 可选：两个用户登录态分别打开聊天列表，互不可见。

人工验证：

- 使用 `user1@test.com` 创建聊天。
- 切换到 `user2@test.com`，确认聊天列表看不到该聊天。
- 直接访问 `/chat/{user1SessionId}`，确认无法打开。

#### 2.14.4 阶段四：文档归属和私有隔离

目标：

- 文档上传、列表、删除、重建索引按 owner 隔离。
- 文档支持 `private` / `public`。
- 同用户重复 hash 拒绝，不同用户重复 hash 允许。

改动范围：

- `src/lib/data/documents.ts`
- `src/lib/services/delete-document.ts`
- `src/app/api/documents/*`
- `src/app/knowledge/page.tsx`
- `src/components/knowledge/*`

自动化测试：

- API 测试：`GET /api/documents` 只返回当前用户自己的文档。
- API 测试：同用户重复上传相同 hash 返回重复错误。
- API 测试：不同用户上传相同 hash 可以成功创建各自文档。
- API 测试：普通用户不能 DELETE / reindex 其他用户文档。
- API 测试：owner 可以修改自己文档 visibility。

人工验证：

- `user1` 上传 private 文档，`user2` 在自己的文档列表看不到。
- `user1` 删除自己的文档成功。
- `user2` 直接调用或访问 `user1` 文档删除/重建索引入口失败。
- 上传文档默认可见性为 `private`。

#### 2.14.5 阶段五：问答检索权限过滤

目标：

- `POST /api/chat` 从服务端获取当前用户。
- `retrieve()` / `vectorSearch()` 按当前用户可用文档范围过滤。
- 私有文档不会被其他用户检索或引用。

改动范围：

- `src/app/api/chat/route.ts`
- `src/lib/retrieval/query.ts`
- `src/lib/retrieval/vector-search.ts`
- retrieval tests

自动化测试：

- 单元测试或集成测试：`vectorSearch()` 生成/执行的过滤条件只允许 owner 文档和已选择 public 文档。
- API 测试：`user2` 提问时不会返回 `user1` private 文档 citation。
- 回归测试：无可用文档时，chat API 不应泄露全局 indexed 文档。

人工验证：

- `user1` 上传只包含特定答案的 private 文档。
- `user2` 提问该特定问题，回答不能引用 `user1` 文档。
- `user1` 提问同一问题，可以使用自己的 private 文档。

#### 2.14.6 阶段六：公开文档选择

目标：

- 用户可以查看其他用户公开文档。
- 用户可以勾选/取消勾选公开文档。
- 问答检索只使用已勾选的其他用户公开文档。

改动范围：

- `src/lib/data/public-documents.ts`
- `src/app/api/public-documents/*`
- `src/components/knowledge/*`
- `src/lib/retrieval/vector-search.ts` 如需要进一步防御 visibility 条件

自动化测试：

- API 测试：public 列表只返回其他用户 public 文档，不返回 private 文档和自己的文档。
- API 测试：不能选择 private、未 indexed、已失败或自己的文档。
- API 测试：取消选择后 selection 被删除。
- API/检索测试：未勾选不检索，勾选后检索，取消后不检索。
- API 测试：public 改 private 后 selection 删除或失效。

人工验证：

- `user1` 上传 public 文档。
- `user2` 在公开文档列表看到该文档。
- `user2` 未勾选前提问不会使用该文档。
- `user2` 勾选后提问可以使用该文档。
- `user2` 取消勾选后后续提问不再使用该文档。

#### 2.14.7 阶段七：管理员能力和清理流程

目标：

- 管理员可以创建/删除普通用户。
- 管理员可以查看和删除全站文档。
- 删除用户/文档时清理数据库、索引、storage 和选择关系。

改动范围：

- `src/lib/data/users.ts`
- `src/lib/services/delete-user.ts`
- `src/lib/services/delete-document.ts`
- `src/app/api/admin/*`
- admin 页面入口

自动化测试：

- API 测试：普通用户不能访问 `/api/admin/*`。
- API 测试：管理员不能删除自己的账号。
- API 测试：管理员删除普通用户后，该用户 sessions、messages、documents、chunks、selections 被清理。
- API 测试：管理员删除公开文档后，所有用户 selection 被清理。
- service 测试：storage 删除失败时数据库删除策略符合设计。

人工验证：

- admin 登录后能看到用户列表和全站文档。
- admin 删除 `user2` 前需要确认，删除后 `user2` 不能登录或不能获得业务资料。
- admin 删除某个 public 文档后，其他用户公开选择列表和问答检索都不再使用该文档。

#### 2.14.8 阶段八：UI 整合和端到端验收

目标：

- Knowledge 页面按 My/Public/Admin 组织。
- Admin 用户管理入口可用。
- 登录页默认账号提示完整。
- 完成需求验收标准。

改动范围：

- `src/app/auth/signin/page.tsx`
- `src/app/knowledge/page.tsx`
- `src/app/admin/*`
- `src/components/layout/*`
- `src/components/knowledge/*`
- E2E tests

自动化测试：

- E2E：`user1` 创建聊天，`user2` 看不到。
- E2E：private 文档不会被其他用户检索。
- E2E：public 文档勾选前不检索，勾选后检索，取消后不检索。
- E2E：管理员删除公开文档后所有用户不能再检索。
- E2E：登录页展示默认账号信息。

人工验证：

- 按 [REQUIREMENTS.md](./REQUIREMENTS.md) 的验收标准逐条走查。
- 使用三个默认账号完成普通用户和管理员主流程。
- 检查移动端和桌面端核心入口可用。

### 2.15 测试策略

#### 2.15.1 单元/接口测试

需要覆盖：

- 普通用户只能列出自己的 sessions。
- Server Component 不直接 import `prisma` 访问业务数据。
- 普通用户不能 GET/PATCH/DELETE 其他用户 session。
- PATCH session 不能通过自定义 ID 创建或覆盖其他用户 session。
- 用户上传同 hash 文件时，同用户重复失败，不同用户允许。
- 普通用户不能删除其他用户文档。
- owner 可以修改自己文档 visibility。
- public 改 private 后选择关系失效。
- 用户只能选择其他用户 public indexed 文档。
- `POST /api/chat` 的检索范围只包含当前用户可用文档。
- 管理员不能删除自己。
- 管理员可以删除普通用户，并清理关联数据。

#### 2.15.2 E2E 验收

需要覆盖：

- `user1` 创建聊天，`user2` 看不到。
- `user1` 私有文档不会被 `user2` 检索。
- `user1` 公开文档被 `user2` 勾选前不会参与检索。
- `user2` 勾选后可以参与检索。
- 取消勾选后不再参与检索。
- 管理员删除公开文档后所有用户都不能再检索。

### 2.16 风险和注意事项

- 当前 API 存在全局读写行为，多用户改造必须先完成后端隔离，再做 UI。
- 当前 `knowledge/page.tsx` 和 `chat/[id]/page.tsx` 直接访问数据库，是多用户隔离需要优先收敛的入口。
- `PATCH /api/sessions/[id]` 的 upsert 逻辑是权限风险点，需要优先改造。
- 向量检索是最关键的数据泄露风险点，必须从后端传入当前 userId 并在 SQL 中过滤。
- Supabase service role client 绕过 RLS，所有 admin 和 storage 操作必须在应用层显式校验。
- 删除用户涉及 Supabase Auth、业务数据库和 storage 三处状态，失败处理需要日志和可重试思路。
- 需求明确不做审计日志，因此设计不引入审计表。
- 阶段一的 `DEFAULT_ADMIN_USER_ID` 业务写入兼容是开发期过渡方案，不能作为最终生产逻辑保留。

### 2.17 生产发布策略

阶段拆分只用于开发、验证和代码 review。生产环境不允许发布中间阶段，尤其不能只发布阶段一的数据模型和临时默认 admin 归属逻辑。

远端部署时不要求保留已有业务数据。当前远端数据不作为迁移目标，发布窗口内可以选择清空或重建业务表、索引和 storage 文档对象，再以默认演示账号重新初始化系统。下面的发布策略仍要求一次性发布完整多用户能力，但不要求为旧聊天、旧文档提供平滑迁移和可回滚的数据兼容路径。

#### 2.17.1 发布原则

- 生产发布必须在阶段一到阶段八全部完成后进行。
- 生产发布包必须包含完整的数据模型、授权、数据访问层、聊天隔离、文档隔离、检索隔离、公开文档选择、管理员能力和 UI 验收。
- 开发阶段允许的临时兼容逻辑不得进入最终生产业务路径。
- 远端旧业务数据可以丢弃；发布前仍建议备份，备份只作为故障恢复手段，不作为多用户数据迁移输入。
- 数据库迁移是前向变更，代码回滚不能自动回滚 schema；如果远端采用清空或重建策略，回滚优先恢复发布前备份或重新部署兼容新 schema 的修复版本。

#### 2.17.2 发布前检查清单

发布前必须确认：

- `POST /api/chat` 已从服务端获取当前用户，并把 `userId` 传入 retrieval。
- `retrieve()` / `vectorSearch()` 已按当前用户可用文档范围过滤。
- session API 已按当前用户过滤，管理员也不能通过普通 session API 访问其他用户聊天。
- document API 已按 owner/admin 权限过滤。
- public document selection API 已限制只能选择其他用户 public indexed 文档。
- admin API 已全部调用 `requireAdmin()`。
- Server Component/page 不再直接散写权限敏感 Prisma 查询。
- 除 seed、migration 和明确的 admin/system 工具外，没有业务写入路径硬编码 `DEFAULT_ADMIN_USER_ID`。
- `pnpm exec tsc --noEmit` 通过。
- `pnpm test` 通过。
- 关键 E2E 验收通过。

#### 2.17.3 生产部署顺序

建议生产部署顺序：

1. 备份远端数据库和需要保留的环境配置。
2. 暂停或避开会产生新聊天、上传和索引任务的使用窗口。
3. 部署完整多用户代码。
4. 执行远端数据库迁移，或在确认可丢弃旧数据后重建远端数据库并应用当前迁移。
5. 清理旧 storage 文档对象，避免旧文件残留但数据库已无对应记录。
6. 执行 `pnpm users:seed:prod`。
7. 执行 smoke test：
   - `admin@test.com` 可以登录。
   - `user1@test.com` 和 `user2@test.com` 可以登录。
   - `user1` 与 `user2` 聊天列表互不可见。
   - `user1` private 文档不会被 `user2` 检索。
   - public 文档勾选前不检索、勾选后检索、取消后不检索。
   - admin 不能删除自己，可以管理普通用户和全站文档。
8. 观察日志和错误率，确认无权限异常和检索泄露。

#### 2.17.4 回滚注意事项

- 如果迁移已经执行，不能只回滚应用代码到旧版本；旧版本不理解新 schema 和 owner 字段。
- 如果远端已清空或重建业务数据，严重故障时优先恢复发布前备份；如果接受丢弃发布窗口内新数据，也可以重新清空并部署修复版本。
- 如果只需要应用层回滚，必须保证回滚版本兼容新 schema，否则需要专门准备兼容分支。
- 删除用户或文档操作涉及 storage 和 auth 状态，发布窗口内应避免并发执行高风险管理操作。
