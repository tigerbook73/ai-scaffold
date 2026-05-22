# site-separation 设计

## 1. 当前上下文

项目当前已经具备：

- user 侧页面：`/`、`/about`、`/auth/signin`、`/chat/*`、`/knowledge`。
- admin 侧页面：`/admin`、`/admin/users`、`/admin/documents`。
- user 侧 API：`/api/chat`、`/api/documents/*`、`/api/sessions/*`、`/api/public-documents/*`。
- admin 侧 API：`/api/admin/*`。
- Supabase SSR client：`src/lib/supabase/browser.ts`、`src/lib/supabase/server.ts`。
- route policy：`src/lib/route-policy.ts`。
- auth proxy：`src/proxy.ts`。
- user/admin role helpers：`requireUser()`、`requireAdmin()`。

当前主要缺口：

- `/auth/signin` 是 client component 直接调用 Supabase browser client 登录，没有服务端 role 判断和智能跳转。
- proxy.ts 未区分"未登录"（→ sign-in）和"已登录但无权限"（→ 403）。
- `/admin/about` 尚不存在。
- 登录后跳转逻辑未按 role 区分。

---

## 2. 设计原则

- **单一入口**：`/auth/signin` 是唯一 sign-in 页面；session 和 cookie 不分站点。
- **四层隔离**：路由命名空间、访问控制（role 校验）、权限驱动的导航展示、数据权限（ownerUserId）。
- **服务端授权优先**：middleware、server component 和 route handler 执行真实授权；client auth state 只用于 UI。
- **Endpoint 优先**：登录、退出和 auth state 查询通过 route handler 实现，不使用 Server Action。
- **role 校验不可省略**：admin 页面和 API 必须校验 `role=admin`；有 session 不等于有 admin 权限。
- **数据权限不变**：user 侧数据继续按 `ownerUserId` 隔离；admin 全局能力只通过 `/api/admin/*` 暴露。

---

## 3. 路由策略

在现有 `src/lib/route-policy.ts` 基础上直接扩展，不迁移为目录模块。实际内容约 150 行以内，单文件足够。若将来体量超过 300 行再考虑拆分，调用方路径不变（`@/lib/route-policy`）。

建议类型：

```ts
type RouteAccess = "public" | "sign-in" | "user-private" | "admin-private" | "public-api" | "user-api" | "admin-api";
```

建议 helper：

- `getRoutePolicy(pathname)`
- `isUserPrivateRoute(pathname)`
- `isAdminPrivateRoute(pathname)`
- `isSignInRoute(pathname)`
- `isAdminRoute(pathname)`
- `buildCurrentPath(pathname, search)`
- `sanitizeRedirectPath(from)`
- `resolvePostLoginRedirect(role, from)` — 登录后跳转决策
- `shouldHideUserShell(pathname, isAuthenticated)`

默认路径常量：

```ts
export const SIGN_IN_PATH = "/auth/signin";
export const SIGN_OUT_PATH = "/auth/signout";
export const USER_HOME_PATH = "/chat/last";
export const ADMIN_HOME_PATH = "/admin";
```

`from` sanitization 规则：

- 接受任意合法内部路径（user 路径或 admin 路径均可）。
- 拒绝外部 URL、协议相对 URL、`/auth/signin` 自身、`/auth/signout`、`/api/*` 前缀路径、`/_next/*` 前缀路径。
- 登录后由 `resolvePostLoginRedirect(role, from)` 决定最终目标：
  - `from` 合法且 role 有权访问 → 跳转到 `from`。
  - `from` 是 admin 路径且 role=user → 忽略 `from`，返回 `USER_HOME_PATH`。
  - `from` 不存在或不合法 → 返回 role 对应的 home（role=admin → `ADMIN_HOME_PATH`；role=user → `USER_HOME_PATH`）。

---

## 4. Supabase Client

继续使用单一 session，不引入站点化 client factory。

现有 `src/lib/supabase/server.ts` 和 `service.ts` 保持不变，不引入额外拆分。URL/key 读取和 cookie adapter 是 `server.ts` 的内部细节，无需独立成文件。

browser client 的处理：登录迁移到服务端 endpoint 后，browser client 的登录用途消除。若保留 browser client 用于 `onAuthStateChange`，需确保不被用于授权判断。

---

## 5. 登录流程

### 5.1 sign-in（统一入口）

保留页面 `/auth/signin`，提交逻辑改为调用服务端 endpoint。

Endpoint：`POST /api/auth/signin`

流程：

1. 接收 `email`、`password`、可选 `from`。
2. 使用临时 Supabase client（`persistSession: false, autoRefreshToken: false`）验证凭证。
3. 登录失败 → 返回 401。
4. 一次查询取得 `user_profiles`（含 `role`）；profile 缺失 → 返回 403。此步骤在写 cookie 之前完成，确保不留脏 session。
5. 用 `access_token` + `refresh_token` 调用 server client `setSession()`，写入 session cookie。
6. 调用 `resolvePostLoginRedirect(role, from)` 计算 redirect target。
7. 返回 redirect target。

不限制 role，任何有效 profile 均可登录。

### 5.2 sign-out

`GET /auth/signout`：server client `signOut()`，清理 session cookie，跳转 `/auth/signin` 或 `/`。

只有一个 signout 路由；user shell 和 admin shell 都链接到此。

---

## 6. Auth Helpers

现有 `requireUser()` / `requireAdmin()` 保留，无需站点化版本。

调整确认：

- `requireUser()`：检查 session 存在 + `user_profiles` 有记录；不校验 role（role=admin 也通过）。
- `requireAdmin()`：检查 session 存在 + `user_profiles.role = admin`；不满足时抛 `AuthError(403)`。
- user 侧 API 全部使用 `requireUser()`。
- admin 侧 API 全部使用 `requireAdmin()`。

文件结构：`errors.ts` 和 `api.ts` 已有，新增 `helpers.ts` 存放 `requireUser()`、`requireAdmin()` 和内部共用的 `getProfile()`，三者高度内聚，无需各占一个文件。

```txt
src/lib/auth/
  errors.ts     ← AuthError（已有）
  helpers.ts    ← requireUser() + requireAdmin() + getProfile()（新增）
  api.ts        ← authErrorResponse、validationErrorResponse（已有）
```

---

## 7. Proxy 与页面授权

`src/proxy.ts` 负责 session 存在性检查和重定向；role 校验在 server component / route handler 做，以避免 middleware 的额外 DB 查询。

Proxy 行为：

- public 页面：直接放行。
- `/auth/signin`：
  - 有 session → 查询 `user_profiles.role`，调 `resolvePostLoginRedirect(role, from)` 跳转（middleware 唯一的 DB 查询，仅在 sign-in 页面触发，频率低）。
    - 若 role 查询失败（profile 缺失、DB 错误）→ 放行到 sign-in 页面，不清 session（DB 瞬时抖动不应将用户登出）。
  - 无 session → 放行。
- user 私有页面：
  - 无 session → 跳 `/auth/signin?from=...`。
  - 有 session → 放行（role 校验在 route handler）。
- admin 私有页面：
  - 无 session → 跳 `/auth/signin?from=...`。
  - 有 session → 放行（role 校验在 admin layout / route handler）。

已登录但 role=user 访问 admin 私有页面时，middleware 放行后由 admin layout 调用 `requireAdmin()` 抛 403；页面层捕获并渲染 403 UI，不再重定向 sign-in（用户已登录，再跳 sign-in 会让人困惑）。

API route 不依赖 proxy 做授权；route handler 内必须调用对应 require helper。

---

## 8. Auth State 与 UI

建议 auth state 模型：

```ts
interface AuthState {
  isAuthenticated: boolean;
  id: string | null;
  email: string | null;
  role: "user" | "admin" | null;
}
```

Endpoint：`GET /api/auth/me`，返回当前 session 的精简 auth state（补充 `role` 字段，若当前实现缺失）。

客户端使用 auth state 控制：

- email 显示和 signout 按钮。
- 是否展示 user shell 或 admin shell（由路由决定，不由 role 决定）。
- user shell 中 admin 管理入口按 role 条件渲染（role=admin 可见，role=user 不可见）。

客户端不能把 auth state 当作安全边界。

---

## 9. Shell 与导航

### 9.1 user shell

- 保留 Chat、Knowledge、About。
- role=admin 用户在 user shell 中可以看到 admin 管理入口（TopBar 中的 Admin 按钮）；role=user 不可见。
- `/auth/signin` 不显示 user shell。

当前 TopBar / Sidebar 中的 Admin 按钮已按 role 条件渲染，保留此逻辑即可，无需移除。

### 9.2 admin shell

- `/admin/*` 私有页面使用 admin shell（不包含登录/登出流程页面）。
- Admin shell sidebar：Dashboard、Users、Documents、About，以及 Chat / Knowledge 等 user 功能入口。
- Admin shell topbar：当前账号 email + signout 按钮（链接到 `/auth/signout`）。

### 9.3 About

- `/about`：public about，无需登录。
- `/admin/about`：新增，admin shell 内，role=admin 才可访问。

---

## 10. 数据与权限

不需要数据库 schema 变更。

数据访问规则：

- user sessions/documents/selections 继续按 `ownerUserId` 过滤。
- admin 账号访问 user 站点时，只见自己的 user 数据。
- admin 全局查询和管理只在 `/api/admin/*` 中通过 `requireAdmin()` 暴露。

---

## 11. 测试策略

### 11.1 单元测试

- route-policy：user/admin/public route classification、`resolvePostLoginRedirect` 各 role/from 组合。
- redirect sanitizer：拒绝外部 URL、协议相对 URL、`/auth/signin` 自身、`/auth/signout`、`/api/*`、`/_next/*`。
- `requireUser()`：接受 role=admin session；无 session 抛 401。
- `requireAdmin()`：接受 role=admin；role=user 抛 403；无 session 抛 401。

### 11.2 Route Handler 测试

- `POST /api/auth/signin`：成功写 cookie；缺失 profile 返回 403；role=user 跳 user home；role=admin 跳 admin home；from 路径 role 无权时忽略。
- `GET /auth/signout`：清理 session，跳转正确。
- `GET /api/auth/me`：返回含 `role` 的 auth state。
- user API：无 session 返回 401；role=user 和 role=admin 均可访问自己的数据。
- admin API：role=user 返回 403；role=admin 返回数据。

### 11.3 E2E

- anonymous `/chat/last` → `/auth/signin`。
- anonymous `/admin` → `/auth/signin?from=/admin`。
- role=user 登录 → 跳 `/chat/last`。
- role=admin 登录 → 跳 `/admin`。
- role=user 访问 `/admin` → 403 页面（不重定向 sign-in）。
- role=admin 访问 `/chat/last` → 允许，user shell 中可见 admin 入口。
- signout → 清理 session，跳 `/auth/signin`。

---

## 12. 实施阶段

### Phase 1: 路由策略模型

- 在 `src/lib/route-policy.ts` 中扩展 user/admin route classification、`RouteAccess` 类型和路径常量。
- 新增 `resolvePostLoginRedirect(role, from)` 和 `sanitizeRedirectPath(from)`。
- 更新路由策略测试。

### Phase 2: Auth Helper 整理

- 新增 `src/lib/auth/helpers.ts`，集中 `requireUser()`、`requireAdmin()`、`getProfile()`。
- 确认 `requireUser()` 接受 role=admin。
- `GET /api/auth/me` 补充 `role` 字段。

### Phase 3: 服务端登录

- 将 `/auth/signin` 从 browser direct sign-in 改为调用服务端 endpoint。
- 新增 `POST /api/auth/signin`，含 role-aware redirect 逻辑。
- 新增或更新 `GET /auth/signout`。
- 添加 route handler 测试。

### Phase 4: Proxy、页面和 shell 分离

- 更新 `src/proxy.ts`：admin 私有页面有 session 时放行（role 交给 layout）。
- admin layout 调用 `requireAdmin()`；role=user 时渲染 403 UI，不重定向。
- 新增 `/admin/about` 页面。
- 确认 user TopBar / Sidebar 的 Admin 按钮已按 role 条件渲染正确，无需移除。
- AdminSidebar 增加 About，以及 Chat / Knowledge 等 user 功能快捷入口。

### Phase 5: 验证与清理

- 补齐 e2e 测试。
- 运行单元测试、类型检查和 build。
- 更新与本功能冲突的旧 feature docs 或在 `PROGRESS.md` 记录覆盖关系。

---

## 13. 风险与待确认

- `/auth/signin` 已登录时跳转需要读取 role（middleware 的唯一 DB 查询），频率低但需要确认性能可接受。
- browser client `onAuthStateChange` 在迁移到服务端登录后可能收不到登录事件；需评估是否改为 `/api/auth/me` + SWR 轮询，或保留 browser client 仅用于订阅。
- 旧 `admin-ui` 文档与本功能有冲突，实现前应标记被 `site-separation` 覆盖的条目。
