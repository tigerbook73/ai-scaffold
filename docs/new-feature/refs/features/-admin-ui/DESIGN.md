# admin-ui 设计

## 1. 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

需求已随提交 `35ae5a3`（codex-version）纳入版本控制，文件头标注状态为**草稿，待确认**。设计范围已从原 `admin-pagination` 扩大为独立管理界面 `admin-ui`，与需求文档保持一致。

---

## 2. 现状

- 当前只有 `src/app/admin/page.tsx`，没有 `src/app/admin/layout.tsx`，也没有 `/admin/users` 或 `/admin/documents` 子页面。
- `/admin` 目前复用主应用全局 `Providers` 内的 `TopBar` 和 `AppSidebar`，没有独立管理导航。
- `src/components/admin/AdminWorkspace.tsx` 是一个单页 client workspace，同时承载创建用户、用户列表、删除用户、文档列表和删除文档。
- 主界面 `TopBar` 和 `AppSidebar` 已按 `role === "admin"` 显示 Admin 入口，但入口样式仍是普通导航项。
- 管理 API 已存在：
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `DELETE /api/admin/users/[id]`
  - `GET /api/admin/documents`
  - `DELETE /api/admin/documents/[id]`
- `POST /api/admin/users` 后端校验为 `email` 格式和 `password.min(6)`，默认 role 支持 `user`，但 schema 仍允许 `admin`。前端当前固定发送 `role: "user"`。
- 缺口：
  - 修改用户密码 API 和 UI 尚不存在。
  - 管理端独立 layout、TopBar、Sidebar 尚不存在。
  - `/admin/users` 和 `/admin/documents` 子路由尚不存在。
  - 管理员普通登录后仍默认跳转 `from`，当前默认值是 `/chat/new`，还未按角色落到 `/admin`。

---

## 3. 设计原则

- **管理界面与主界面导航分离**：`/admin/**` 内不渲染主界面的 `TopBar` / `AppSidebar`。管理员回到 FAQ 后再进入普通用户体验。
- **权限在服务端兜底**：所有 `/admin` 页面和 `/api/admin/*` 入口继续调用 `requireAdmin()`。客户端只控制可见性，不作为安全边界。
- **复用现有数据层和服务层**：用户和文档列表、创建用户、删除用户、删除文档优先复用现有 `lib/data/*` 和 `lib/services/*`。
- **不扩大需求范围**：不实现搜索、排序、分页、设置页、角色升降级或审计日志。
- **UI 使用英文**：管理界面所有 UI 文本（按钮、表头、提示、弹窗内容）使用英文，与主应用保持风格一致。
- **UI 尺寸遵循现有系统**：按 `docs/ui-system.md` 使用 `PageShell`、`text-app-*`、shadcn 控件和 Tailwind v4 CSS-first token，不新增 `tailwind.config.ts`。
- **Next.js App Router 约定**：使用 `app/admin/layout.tsx` 承载 admin shared UI；子页面放在对应 `page.tsx`；Route Handler 继续放在 `app/api/**/route.ts`。

---

## 4. 路由结构

目标结构：

```text
src/app/admin/
  layout.tsx
  page.tsx
  users/
    page.tsx
  documents/
    page.tsx
```

API 结构：

```text
src/app/api/admin/
  users/
    route.ts
    [id]/
      route.ts
      password/
        route.ts
  documents/
    route.ts
    [id]/
      route.ts
```

---

## 5. Layout 与导航

### 5.1 Root Providers 调整

当前 `src/app/providers.tsx` 无条件渲染主应用 `AppSidebar` 和 `TopBar`。为了让 `/admin/**` 拥有独立 layout，需要按路径分流：

- 在 client `Providers` 内通过 `usePathname()` 判断 `pathname.startsWith("/admin")`。
- admin 路径只保留全局 provider 能力：theme、auth context、tooltip、toaster。
- 非 admin 路径继续渲染现有 `SidebarProvider`、`AppSidebar`、`SidebarInset` 和 `TopBar`。

这样可以避免 admin layout 被主应用导航包裹，同时保留主题、toast 和认证上下文。

### 5.2 Admin Layout

新增 `src/app/admin/layout.tsx`：

- Server Component。
- 调用 `requireAdmin()`，非管理员访问时重定向到主界面或触发 403。
- 渲染 admin 专属 shell：
  - 顶部栏标题：`FAQ-RAG Admin`。
  - 顶部右侧提供主题切换、退出登录和"回到 FAQ"入口。
  - 左侧专属垂直导航。
  - 主内容区域渲染 `children`。

建议非 admin 用户直接访问 `/admin/**` 时重定向到 `/chat/new`。API 仍返回 401/403 JSON。

### 5.3 Admin 导航项

左侧导航包含：

| 标签      | 路由               | 激活规则                                  | 图标建议          |
| --------- | ------------------ | ----------------------------------------- | ----------------- |
| Dashboard | `/admin`           | `pathname === "/admin"`                   | `LayoutDashboard` |
| Users     | `/admin/users`     | `pathname.startsWith("/admin/users")`     | `Users`           |
| Documents | `/admin/documents` | `pathname.startsWith("/admin/documents")` | `Files`           |

导航风格复用 `src/components/ui/sidebar.tsx` 的模式和密度，但组件应独立命名，例如 `AdminSidebar`，避免与主界面的 `AppSidebar` 混在一起。

### 5.4 回到 FAQ

Admin 顶部栏提供明显按钮：

- 文案：`Back to FAQ`
- 目标：优先使用 `getLastChatHref()`；如果不可用则 `/chat/new`。
- 点击后进入主应用 shell，主应用导航和普通用户体验完全一致。

### 5.5 用户 Email 显示与 Auth Context 扩展

**auth-context.tsx 扩展**：

在 `AuthContextValue` 中增加 `email: string | null` 字段。`AuthContextProvider` 接收 `initialEmail` prop，由 `providers.tsx` 从服务端会话传入（与 `initialAuth`、`initialRole` 同路径）。Supabase `onAuthStateChange` 回调中同步更新：`session?.user.email ?? null`。

注：auth-context 中的 email 来自 Supabase auth session，仅用于显示用途，不作为权限判断。

**TopBar.tsx 更新**：

在 SignOut 按钮左侧插入 Email 显示：

- 仅登录状态可见，小屏幕隐藏（`hidden sm:inline`）
- SignOut 按钮 `title` 属性（tooltip）：`Sign out (${email})`

**AdminTopBar.tsx 更新**：

AdminTopBar 从 props 接收 `email`（由 `admin/layout.tsx` 服务端传入），在 SignOut 左侧同样显示 Email（小屏隐藏），tooltip 同样含 Email。

---

## 6. 页面设计

### 6.1 `/admin` Dashboard

职责：提供管理概览和进入子页面的入口，不承载完整管理表格。

Server side 读取：

- `listUsers()` 获取用户总数、管理员数、普通用户数。
- `listAdminDocuments({ skip: 0, take: 5 })` 获取最近文档和总文档数。

展示：

- 用户总数
- 文档总数
- 管理员数 / 普通用户数
- 最近文档列表，显示文件名、所有者、状态、可见性
- 跳转到 `/admin/users`、`/admin/documents` 的操作入口

### 6.2 `/admin/users`

职责：用户列表、创建用户、删除用户、修改用户密码。

Server side 读取：

- `listUsers()`，暂不分页。

Client component 建议拆分为 `AdminUsersPageClient` 或 `AdminUsersWorkspace`：

- 创建用户通过 **Dialog 弹窗**进行：
  - 触发：点击 "Add User" 按钮，打开 Dialog
  - 表单字段：`email`、`password`
  - 固定提交 `role: "user"`
  - 前端 Zod 校验与后端共享同一 schema：`email: z.string().email()`、`password: z.string().min(6)`
  - 校验失败时在字段下方显示具体错误信息（而非依赖浏览器原生提示）
  - 提交成功后关闭 Dialog、刷新用户列表、toast 提示
- 用户表格：
  - 邮箱
  - 角色
  - 注册日期
  - 操作
- 删除用户：
  - 二次确认弹窗
  - 自己的删除按钮禁用
  - API 已禁止删除自己
- 修改密码：
  - 每行提供"修改密码"操作
  - 二次弹窗输入新密码
  - 前端校验 `password.length >= 6`
  - 不允许修改邮箱、角色或其他属性

### 6.3 `/admin/documents`

职责：全站文档列表和删除文档。

Server side 读取：

- `listAdminDocuments({ skip: 0, take: 50 })`。
- 需求明确暂不支持分页；保留当前 50 条上限会遗漏更多文档。实施时应改为获取足够覆盖当前管理列表的全部数据，或将 `take` 设置为后端允许的最大值并在 `PROGRESS.md` 标注后续分页风险。

推荐在需求未引入分页前，保持 UI 无分页控件；如果文档数量超过后端 `pageSize.max(100)`，应在已知不一致中记录。

表格列：

- 文件名
- 所有者
- 状态
- 可见性
- 选择数
- 操作

空状态：

- 无文档时仍渲染表格（`<Table>`），`<TableBody>` 内显示单行跨全列的 "No documents found." 占位文字。
- 不使用 early return 直接返回段落文本。

删除文档：

- 二次确认弹窗
- 复用 `DELETE /api/admin/documents/[id]`
- 删除成功后从本地 state 移除并 `router.refresh()`

---

## 7. API 与服务层

### 7.1 已有 API 保留

`GET /api/admin/users`

- 继续调用 `requireAdmin()`。
- 返回 `{ items }`。

`POST /api/admin/users`

- 继续调用 `requireAdmin()`。
- 后端 schema 应收紧为只允许创建普通用户：

```ts
z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

- 服务层继续调用 `createUserAccount({ role: "user" })`。

`DELETE /api/admin/users/[id]`

- 继续禁止删除自己。
- 继续复用 `deleteUserAccount()`。

`GET /api/admin/documents`

- 继续调用 `requireAdmin()`。
- 当前分页参数可保留给未来扩展，但 UI 不展示分页。

`DELETE /api/admin/documents/[id]`

- 继续复用 `deleteDocument()`。

### 7.2 新增修改密码 API

新增 `PATCH /api/admin/users/[id]/password`：

请求：

```json
{
  "password": "new-password"
}
```

校验：

- `requireAdmin()`
- `password: z.string().min(6)`
- 允许管理员修改自己的密码，但成功后当前会话是否仍有效取决于 Supabase 行为；如有不确定，实施时人工验证。

服务：

- 新增 `src/lib/services/update-user-password.ts`，使用 Supabase service role：

```ts
supabase.auth.admin.updateUserById(userId, { password });
```

响应：

- 成功：`204`
- 用户不存在或 Supabase 返回 not found：`404`
- 校验失败：`400`
- 非 admin：`401/403`

测试：

- 非 admin 被拒绝
- 密码不足 6 位返回 400
- service role 被正确调用
- Supabase 错误映射为合适响应

---

## 8. 登录后落点

当前登录页默认 `from` 为 `/chat/new`。目标行为：

- URL 带 `from` 时，登录成功后 `router.replace(from)`。
- URL 不带 `from` 时，登录成功后读取当前用户 profile：
  - admin：`/admin`
  - user：`/chat/new`

实现建议：

- 新增轻量 API `GET /api/auth/me` 或复用现有可安全暴露的 user profile helper，返回 `{ id, email, role }`。
- 登录成功后，若没有显式 `from`，调用该 API 决定目标。
- 保留 `lastChat.clear()` 的现有行为。

注意：不能仅依赖 Supabase auth metadata 判断角色，业务角色源是 `user_profiles.role`。

---

## 9. 主界面 Admin 入口

主界面仍只对 admin 显示入口，普通用户完全不可见。

**TopBar（右侧常驻操作区）**：

- Admin 按钮移至 TopBar 右侧常驻操作区（主题切换、SignOut 同区域），不放在 `hidden md:flex` 的 nav 内，确保所有屏幕尺寸下均可见。
- 样式：`Shield` 图标 + badge 边框，跳转 `/admin`。
- 通过 `useAuth().role` 判断，仅 admin 渲染。

**ChatSidebarContent（chat 视图 sidebar footer）**：

- `ChatSidebarContent` 的 `SidebarFooter` 中增加 Admin 项（`SidebarMenuItem`），位于 About 之后（最底部）。
- 通过 `useAuth().role` 判断，仅 admin 可见。
- 图标：`Shield`，href：`/admin`，tooltip：`Admin`。

**AppSidebar（非 chat 视图，如 /knowledge、/about）**：

- 已有 Admin 项，将 `isActive` 修正为 `pathname.startsWith("/admin")`（原为精确匹配 `/admin`）。
- `/admin/**` 路径下 AppSidebar 不渲染（providers.tsx 分流），此修正仅对普通页面生效。

---

## 10. 组件拆分

建议新增：

```text
src/components/admin/
  AdminShell.tsx
  AdminTopBar.tsx
  AdminSidebar.tsx
  AdminDashboard.tsx
  AdminUsersWorkspace.tsx
  AdminDocumentsWorkspace.tsx
```

迁移策略：

- 从现有 `AdminWorkspace.tsx` 提取用户管理逻辑到 `AdminUsersWorkspace.tsx`。
- 从现有 `AdminWorkspace.tsx` 提取文档管理逻辑到 `AdminDocumentsWorkspace.tsx`。
- `AdminWorkspace.tsx` 可在迁移完成后删除，或临时保留到所有引用清空。

---

## 11. 数据模型

本 feature 不需要 Prisma schema 变更。

依赖现有字段：

- `UserProfile.id`
- `UserProfile.email`
- `UserProfile.role`
- `UserProfile.createdAt`
- `Document.name`
- `Document.ownerUserId`
- `Document.status`
- `Document.visibility`
- `Document.owner.email`
- `Document._count.selections`

---

## 12. 测试策略

### 12.1 API 测试

- `POST /api/admin/users` 不允许创建 admin role。
- `DELETE /api/admin/users/[id]` 不能删除自己。
- `PATCH /api/admin/users/[id]/password`：
  - admin 可修改密码
  - 非 admin 被拒绝
  - 密码不足 6 位返回 400
  - 目标不存在返回 404
- `GET /api/admin/documents` 和 delete API 保持既有测试通过。

### 12.2 组件或页面测试

根据现有测试栈补充最小覆盖：

- admin 用户能看到主界面 Admin 入口。
- 普通用户看不到 Admin 入口。
- 用户管理页面创建表单前端校验不足密码。
- 删除用户和删除文档需要确认弹窗。
- 修改密码弹窗提交新密码。

### 12.3 人工验证

- admin 访问 `/admin` 显示 Dashboard。
- admin 可访问 `/admin/users` 和 `/admin/documents`。
- 普通用户直接访问 `/admin`、`/admin/users`、`/admin/documents` 被重定向或 403。
- admin 普通登录后进入 `/admin`。
- 带 `from=/knowledge` 登录后回到 `/knowledge`。
- 管理界面点击"回到 FAQ"进入主界面。

---

## 13. 实施阶段

### 阶段 1：Admin Shell 与路由拆分

- 调整 `Providers`，让 `/admin/**` 不再渲染主应用 `TopBar` / `AppSidebar`。
- 新增 `src/app/admin/layout.tsx`。
- 新增 `AdminTopBar`、`AdminSidebar`、`AdminShell`。
- 将 `/admin` 改为 Dashboard。
- 新增 `/admin/users` 和 `/admin/documents` 页面。

验证：

- `pnpm exec tsc --noEmit`
- 人工访问三个 admin 路由。

### 阶段 2：用户管理页完善

- 从旧 `AdminWorkspace` 迁移创建和删除用户逻辑。
- 创建用户前端校验与后端保持一致。
- 收紧 `POST /api/admin/users`，确保只能创建普通用户。
- 新增修改密码服务和 `PATCH /api/admin/users/[id]/password`。
- 用户管理 UI 接入修改密码弹窗。

验证：

- API Jest 测试。
- `pnpm exec tsc --noEmit`
- 人工创建、删除、修改密码。

### 阶段 3：文档管理页迁移

- 从旧 `AdminWorkspace` 迁移文档列表和删除逻辑。
- 表格列按需求调整：文件名、所有者、状态、可见性、选择数。
- 保持无分页 UI。
- 处理当前 `take` 上限与"全站文档列表"需求的差异，必要时更新 `PROGRESS.md` 的已知不一致。

验证：

- 既有 admin documents API 测试。
- `pnpm exec tsc --noEmit`
- 人工删除文档并确认公开选择被清理。

### 阶段 4：登录落点与主界面入口

- 登录页支持无 `from` 时按业务 role 跳转。
- 有 `from` 时保持原目标页面优先。
- 主界面 TopBar Admin 入口调整为更明显的 badge 或 icon+text 链接。
- 确认普通用户无 admin 入口。

验证：

- admin 普通登录跳 `/admin`。
- 普通用户普通登录跳 `/chat/new`。
- `from` 场景保持原目标。

### 阶段 5：清理与验收

- 移除不再使用的 `AdminWorkspace` 或旧引用。
- 补齐必要测试。
- 更新 `PROGRESS.md` 的完成项、验证结果和最后确认提交。

---

## 14. 发布策略

- 该 feature 可按阶段开发，但生产发布前应保证 `/admin/**` 路由、admin API、登录落点和主界面入口一致。
- 任何阶段提交前，如果实现状态、下一步、已知不一致或验证结果变化，先更新 `PROGRESS.md`。
- 如果需求仍处于草稿状态，第一阶段实施前应确认是否采用"普通用户访问 `/admin/**` 重定向到 `/chat/new`"作为最终行为。

---

## 15. 风险与注意事项

- `Providers` 分流会影响全局 app shell，需要验证主界面 Chat、Knowledge、About 和 Sign In 不回归。
- 修改密码使用 Supabase admin API，必须避免把 service role 暴露到客户端。
- 后端当前创建用户 schema 允许 `role: "admin"`，与需求"默认 role=user，不支持角色升降级"有冲突，应在阶段 2 收紧。
- 需求说文档管理暂不分页，但全站文档可能超过一次 API 可返回数量；这是产品需求与规模之间的潜在不一致。
