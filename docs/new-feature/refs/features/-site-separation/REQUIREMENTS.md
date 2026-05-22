# site-separation 需求

> 状态：**已确认**
> 目标：将 user 站点和 admin 站点在路由、导航、Shell、页面内容和权限边界上明确分离。共享单一 Supabase session 和单一 sign-in 页面，通过 `role` 控制访问权限。

---

## 1. 背景

当前项目已经有 user 侧功能（Chat / Knowledge / About）和 `/admin` 管理界面，但仍存在一些混合假设：user 和 admin 缺乏独立的页面 shell、登录后跳转逻辑未按 role 区分、已登录但无权限时的访问行为未明确定义等。

本功能将 user 站点和 admin 站点拆成两个清晰的站点边界，继续共享同一个 Supabase 项目、同一个业务数据库、同一套 Supabase session 和单一 sign-in 页面。访问权限由 `user_profiles.role` 决定。

---

## 2. 目标

- 只有一个 sign-in 页面（`/auth/signin`），user 和 admin 均通过此页面登录。
- 使用单一 Supabase session；`user_profiles.role` 决定可访问的站点范围。
- 登录成功后按 role 跳转：role=admin → `/admin`；role=user → `/chat/last`（若有合法 `from` 参数则优先）。
- 未登录访问 user 私有页面或 admin 私有页面，均跳转到 `/auth/signin?from=...`。
- 已登录但 role=user 访问 admin 私有页面时，显示 403 页面（不再重定向到 sign-in）。
- admin 账号登录后可以访问 user 站点（只见自己的数据），也可以访问 admin 站点。
- 导航入口按权限展示：role=admin 在任意页面都可以看到 admin 管理入口；role=user 只看到 user 功能入口。
- public 内容只存在于非 `/admin` 路径下。
- admin 有自己的登录后 about 页面（`/admin/about`）。

---

## 3. 站点隔离边界

单一 session 不意味着两个站点没有边界。隔离体现在以下四个层次：

| 层次           | 隔离方式                                                               |
| -------------- | ---------------------------------------------------------------------- |
| **路由层**     | `/admin/*` 命名空间与 user 路由明确分离                                |
| **访问控制层** | user 私有路由要求 session；admin 私有路由额外要求 `role=admin`         |
| **导航层**     | 导航入口按权限展示：有权限的入口可见，无权限的入口不可见               |
| **数据层**     | user API 按 `ownerUserId` 过滤；admin 全局能力只在 `/api/admin/*` 暴露 |

---

## 4. 术语

| 术语        | 含义                                                            |
| ----------- | --------------------------------------------------------------- |
| user 站点   | 面向普通使用者的站点区域，包括 Chat、Knowledge、public About 等 |
| admin 站点  | 面向管理员的站点区域，路径前缀为 `/admin`                       |
| session     | 单一 Supabase SSR session cookie                                |
| public 内容 | 未登录用户也可访问的内容，且不位于 `/admin` 路径下              |

---

## 5. 角色

| 角色      | 说明                                      |
| --------- | ----------------------------------------- |
| anonymous | 未登录访问者                              |
| user      | 普通业务用户，`user_profiles.role = user` |
| admin     | 管理员，`user_profiles.role = admin`      |

admin 账号同时也是合法业务账号，登录后可以访问 user 站点功能（仅限自己的数据）。

---

## 6. 路由边界

### 6.1 user 站点

user 站点包含：

- `/`
- `/about`
- `/auth/signin`
- `/auth/signout`
- `/chat/*`
- `/knowledge/*`
- user 侧 API：`/api/chat`、`/api/documents/*`、`/api/sessions/*`、`/api/public-documents/*`

### 6.2 admin 站点

admin 站点包含：

- `/admin`
- `/admin/about`
- `/admin/users`
- `/admin/documents`
- admin 侧 API：`/api/admin/*`

### 6.3 public 内容

- public 内容只能位于非 `/admin` 路径下。
- `/admin/about` 必须 admin 登录后才可访问。
- anonymous 访问 `/admin/about` 时，跳转到 `/auth/signin?from=/admin/about`。

---

## 7. 登录态

### 7.1 单一 Supabase session

user 站点和 admin 站点共享同一个 Supabase Auth session（单一 cookie）。访问权限通过查询 `user_profiles.role` 区分。

要求：

- 服务端通过 session 中的 user ID 查询 `user_profiles.role` 决定访问权限。
- 客户端 UI 不直接读取 Supabase session cookie 来判断权限。
- 客户端 UI 通过服务端 auth state 或 `/api/auth/me` 获取精简登录状态（`isAuthenticated`、`email`、`role`）。
- 客户端登录状态只用于界面展示；页面和 API 授权由 middleware、server component 或 route handler 完成。

### 7.2 sign-in

- 只有 `/auth/signin` 一个 sign-in 页面，user 和 admin 均通过此页面登录。
- 登录流程走服务端 endpoint（`POST /api/auth/signin`）：
  - 验证凭证。
  - 确认 `user_profiles` 存在。
  - 写入 session cookie。
  - 按 role 返回 redirect target：
    - 若 `from` 存在且合法，且 role 有权访问该路径 → 跳转到 `from`。
    - role=admin 且无合法 `from` → `/admin`。
    - role=user 且无合法 `from` → `/chat/last`。
- 已登录用户访问 `/auth/signin` → 直接跳转到 role 对应的 home。

### 7.3 signout

- 只有 `/auth/signout` 一个 signout 路由，清理 session，跳转到 `/auth/signin` 或 `/`。
- user shell 和 admin shell 都链接到 `/auth/signout`。

---

## 8. 访问控制

### 8.1 anonymous

| 访问目标       | 行为                           |
| -------------- | ------------------------------ |
| public 页面    | 允许访问                       |
| user 私有页面  | 跳转到 `/auth/signin?from=...` |
| admin 私有页面 | 跳转到 `/auth/signin?from=...` |
| user API       | 返回 401                       |
| admin API      | 返回 401                       |

### 8.2 已登录（role = user）

| 访问目标       | 行为                                      |
| -------------- | ----------------------------------------- |
| public 页面    | 允许访问                                  |
| user 私有页面  | 允许访问                                  |
| admin 私有页面 | 显示 403 页面（已登录，不重定向 sign-in） |
| user API       | 允许访问自己的数据和 public 数据          |
| admin API      | 返回 403                                  |

### 8.3 已登录（role = admin）

| 访问目标       | 行为                                        |
| -------------- | ------------------------------------------- |
| public 页面    | 允许访问                                    |
| user 私有页面  | 允许访问（user shell 展示，只见自己的数据） |
| admin 私有页面 | 允许访问                                    |
| user API       | 允许访问（数据按 `ownerUserId` 过滤）       |
| admin API      | 允许访问                                    |

### 8.4 admin 账号访问 user 站点

- admin 账号访问 user 站点时，user shell 展示，admin 管理入口按 role 条件渲染（可见）。
- user 站点 API 不因调用者 role=admin 而暴露全局数据；数据按 `ownerUserId` 过滤。
- 全局管理能力只通过 `/api/admin/*` 暴露。

---

## 9. 导航与 Shell

### 9.1 user shell

- 保留 Chat、Knowledge、About 功能入口。
- role=admin 用户在 user shell 中可以看到 admin 管理入口（如 TopBar 中的 Admin 按钮）。
- `/auth/signin` 不显示 user shell。

### 9.2 admin shell

- `/admin/*` 私有页面使用 admin shell。
- admin shell 显示 admin 功能入口（Dashboard、Users、Documents、About）。
- admin shell 可以显示跳转到 user 站点的入口（如 Chat、Knowledge）。

### 9.3 About 页面

- `/about`：public about，user/public 站点，无需登录。
- `/admin/about`：admin about，admin 私有，role=admin 才可访问。

---

## 10. `from` 参数与 redirect

- sign-in 接受合法的 `from` 参数（user 路径或 admin 路径均可）。
- 登录后若 role 无权访问 `from` 路径（例如 role=user 且 from=/admin），忽略 `from`，跳转到 role 对应的 home。
- 拒绝外部 URL、协议相对 URL、`/auth/signin` 自身、`/auth/signout`、`/api/*` 前缀路径、`/_next/*` 前缀路径作为 `from` 目标。

---

## 11. 不在范围内

- 拆分为不同 Supabase project 或不同数据库。
- 子域名部署。
- 双 cookie / 双 session 方案。
- 多个 sign-in 页面。
- OAuth / magic link 登录流程改造。
- 审计日志。
- admin/user 一键切换或同步登录。

---

## 12. 验收标准

- [ ] anonymous 访问 `/chat/last` 跳转到 `/auth/signin?from=/chat/last`。
- [ ] anonymous 访问 `/admin` 跳转到 `/auth/signin?from=/admin`。
- [ ] role=user 登录后跳转到 `/chat/last`（无 `from` 时）。
- [ ] role=admin 登录后跳转到 `/admin`（无 `from` 时）。
- [ ] 已登录（role=user）访问 `/admin/*` 显示 403，不重定向 sign-in。
- [ ] 已登录（role=user）访问 `/api/admin/*` 返回 403。
- [ ] 已登录（role=admin）可以直接访问 `/admin/*`。
- [ ] 已登录（role=admin）可以直接访问 `/chat/*`，只见自己的数据。
- [ ] 已登录用户访问 `/auth/signin` 直接跳转到 role 对应的 home。
- [ ] 登录后 `from` 路径在 role 有权访问时被使用；无权访问时忽略并跳转 home。
- [ ] `/auth/signout` 清理 session，跳转到 `/auth/signin` 或 `/`。
- [ ] role=user 在任意页面看不到 admin 管理入口。
- [ ] role=admin 在 user shell（`/chat/*` 等页面）中可以看到 admin 管理入口。
- [ ] `/about` anonymous 可访问。
- [ ] `/admin/about` 未登录不可访问，role=admin 登录后可访问，role=user 登录后显示 403。
- [ ] sign-in 拒绝外部 URL 和不合法 `from` 参数。
