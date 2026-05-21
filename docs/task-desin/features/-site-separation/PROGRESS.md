# site-separation 进度

## Current Phase

Phase 5: verification and cleanup implemented. Feature is implementation-complete pending any follow-up product review.

## Last Confirmed Commit

810e22d

## Confirmed Decisions

- 只有一个 sign-in 页面（`/auth/signin`），user 和 admin 均通过此页面登录。
- 单一 Supabase session；`user_profiles.role` 决定访问权限。
- 登录后按 role 智能跳转（role=admin → `/admin`；role=user → `/chat/last`）。
- `from` 参数存在时优先使用，但若 role 无权访问目标路径则忽略并跳 role home。
- 已登录但 role=user 访问 admin 私有页面 → admin layout 渲染 403 UI，不重定向 sign-in。
- 未登录访问 user 或 admin 私有页面 → 跳 `/auth/signin?from=...`。
- admin 账号可访问 user 站点，user shell 展示，只见自己的数据。
- user shell 中 admin 管理入口按 role 条件渲染：role=admin 可见，role=user 不可见。
- admin shell 可以显示 Chat / Knowledge 等 user 功能快捷入口。
- 只有一个 signout 路由（`/auth/signout`）；user/admin shell 均链接到此。
- 登录逻辑改为服务端 endpoint（`POST /api/auth/signin`），不使用 Server Action 或 browser direct sign-in。
- `requireUser()` 接受 role=admin session（不限 role=user）。
- `requireAdmin()` 明确校验 `role=admin`。
- `/admin/about` 是 admin 私有页面，role=admin 才可访问。

## Design History

- **初始版本**（已废弃）：设计了双 Supabase session（`sb-faq-user-auth` / `sb-faq-admin-auth`），支持同一浏览器不同账号分别登录 user 和 admin 站点。废弃原因：`@supabase/ssr` 自定义 cookie name 的行为未验证，且"同浏览器双账号"需求不是真实业务需求。
- **中间版本**（已废弃）：单一 session + 两个 sign-in 页面（`/auth/signin` 和 `/admin/signin`）。废弃原因：两个 sign-in 创建相同 session，admin 签入后能访问 user site、user 签入后（若 role=admin）也能访问 admin site，两个入口的区别只剩跳转目标，隔离价值不足以支撑维护成本。
- **当前版本**：单一 session + 单一 sign-in + role-aware redirect。隔离收敛到路由命名空间、访问控制（role 校验）、Shell/导航分离、数据权限四个层次。

## Completed Work

- Created `docs/features/-site-separation/REQUIREMENTS.md`.
- Created `docs/features/-site-separation/DESIGN.md`.
- Created this `PROGRESS.md`.
- Iterated design from dual-session → single-session + dual sign-in → single-session + single sign-in.
- Refined implementation plan to keep `route-policy.ts` and Supabase/auth helpers as focused single-file extensions where practical.
- Extended `src/lib/route-policy.ts` with separated user/admin/page/API route classification.
- Added `SIGN_IN_PATH`、`SIGN_OUT_PATH`、`USER_HOME_PATH`、`ADMIN_HOME_PATH` constants.
- Added role-aware `resolvePostLoginRedirect(role, from)` and stricter redirect sanitization.
- Updated `src/lib/route-policy.test.ts` for route classification, redirect sanitizer, and post-login role routing.
- Added `src/lib/auth/helpers.ts` to centralize `getProfile()`、`getCurrentUser()`、`requireUser()`、`requireAdmin()`.
- Kept `get-current-user.ts`、`require-user.ts`、`require-admin.ts` as compatibility re-export modules.
- Confirmed `requireUser()` accepts role=admin profiles and `requireAdmin()` rejects role=user.
- Added `/api/auth/me` route tests confirming the auth state includes `role`.
- Added `POST /api/auth/signin` route handler with temporary Supabase credential verification, pre-cookie profile lookup, server `setSession()`, and role-aware redirect response.
- Updated `/auth/signin` client form to call the server endpoint instead of browser direct sign-in.
- Updated `/auth/signin` page to redirect already-authenticated users via `resolvePostLoginRedirect(role, from)`.
- Added `/api/auth/signin` and `/auth/signout` route handler tests.
- Updated `src/proxy.ts` so signed-in users visiting `/auth/signin` are redirected by role, while authenticated admin routes pass through to layout authorization.
- Updated admin layout to render a 403 access denied UI for role=user instead of redirecting to sign-in/user home.
- Added `/admin/about`.
- Added About, Chat, and Knowledge entries to admin sidebar.
- Changed user/admin shell signout controls to link to unified `/auth/signout`.
- Fixed `/api/auth/*` route-policy bypass so auth route handlers, not proxy redirects, own auth API responses.
- Updated server sign-in/signout route handlers to attach Supabase cookie mutations to the returned `NextResponse`.
- Changed sign-in success navigation to a full document navigation so server-provided auth state is reloaded after endpoint login.
- Added `e2e/site-separation.test.ts` covering anonymous redirects, role-aware login redirects, user admin 403, admin user/admin access, and signout.
- Added shared e2e sign-in helpers and updated chat/knowledge e2e tests for authenticated routes.
- Fixed knowledge upload table refresh by mutating the `/api/documents` SWR key after upload.
- Refreshed existing e2e expectations for the current About heading, seeded citation question, and local upload/indexing behavior.

## Known Mismatches

- Existing `docs/features/-admin-ui/REQUIREMENTS.md` 仍包含关于站点自由切换、user UI 显示 admin 入口的旧假设；`site-separation` 明确覆盖这些条目。

## Verification Status

- `pnpm test src/lib/route-policy.test.ts`
- `pnpm test src/lib/auth/helpers.test.ts src/app/api/auth/me/route.test.ts src/lib/route-policy.test.ts`
- `pnpm test src/app/api/auth/signin/route.test.ts src/app/auth/signout/route.test.ts src/app/api/auth/me/route.test.ts src/lib/auth/helpers.test.ts src/lib/route-policy.test.ts`
- `pnpm exec playwright test e2e/site-separation.test.ts`
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm build` (passes; Turbopack reports existing NFT tracing warnings involving `next.config.ts` / Prisma import trace)
- `pnpm exec playwright test`

## Next Entry Point

Feature implementation is complete. Future cleanup can reconcile old `docs/features/-admin-ui/REQUIREMENTS.md` assumptions with this feature's final behavior.
