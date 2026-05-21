# admin-ui 实施进度

## 当前状态

- 当前阶段：阶段 1–6 全部完成
- 状态：全功能实现，TypeScript 通过，已知预存失败测试 2 个（与本 feature 无关），待人工验收
- 最后确认的实现提交：`ec7aa69`（admin-ui phase 6: UI 完善与缺陷修复）
- 最后确认的设计提交：`35ae5a3`（codex-version）
- 下一步入口：人工验收（见验收清单）

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`（本文件）

## 文档一致性检查

- 2026-05-12 检查：`docs/features/-admin-ui/REQUIREMENTS.md`、`DESIGN.md`、`PROGRESS.md` 均已纳入 git 跟踪；旧的未追踪文档说明已过期。
- `REQUIREMENTS.md` 已更新：新增 UI 语言约定、Admin 入口可见性要求、Email 显示、Dialog 创建用户、文档列表空状态，状态仍为草稿。
- `DESIGN.md` 已同步更新：与 REQUIREMENTS.md 逐项对齐。
- 阶段 1–5 实现提交：`14e0587`→`23fb816`→`252d821`→`5b5b098`→`c6b6f17`。
- 阶段 6 实现提交：`ec7aa69`。

## 阶段清单

- [x] 阶段 1：Admin Shell 与路由拆分
- [x] 阶段 2：用户管理页完善
- [x] 阶段 3：文档管理页迁移
- [x] 阶段 4：登录落点与主界面入口
- [x] 阶段 5：清理与验收
- [x] 阶段 6：UI 完善与缺陷修复

## 已完成工作

### 文档准备

- 根据 [REQUIREMENTS.md](./REQUIREMENTS.md) 生成 [DESIGN.md](./DESIGN.md)，已与需求逐项核对，无结构性缺口。
- 将进度状态从旧 `admin-pagination` 更新为 `admin-ui`。

### 阶段 1：Admin Shell 与路由拆分

- `src/app/providers.tsx`：添加 `usePathname()` 分流，`/admin/**` 路径跳过 `AppSidebar` / `TopBar`。
- `src/app/admin/layout.tsx`：Server Component，调用 `requireAdmin()`；非 admin 重定向到 `/chat/new`；渲染 `AdminShell`。
- `src/components/admin/AdminShell.tsx`：管理界面骨架（`h-dvh` 布局，AdminTopBar + AdminSidebar + 内容区）。
- `src/components/admin/AdminTopBar.tsx`："FAQ-RAG Admin" 标题、"Back to FAQ"（`getLastChatHref()`）、主题切换、退出登录。
- `src/components/admin/AdminSidebar.tsx`：独立垂直导航（不依赖 SidebarProvider），三项：Dashboard / Users / Documents。
- `src/app/admin/page.tsx`：改写为 Dashboard（统计卡片 + 最近文档表 + 子页面入口）。
- `src/app/admin/users/page.tsx`：只读用户表（邮箱、角色、注册日期），阶段 2 补操作。
- `src/app/admin/documents/page.tsx`：只读文档表（文件名、所有者、状态、可见性、选择数），阶段 3 补删除。
- `pnpm exec tsc --noEmit`：通过，0 错误。

### 阶段 2：用户管理页完善

- `POST /api/admin/users` schema 收紧，移除 role 字段，始终 `role: "user"`。
- `PATCH /api/admin/users/[id]/password` + `update-user-password` 服务新增。
- `AdminUsersWorkspace`：创建/删除/改密码，含二次确认弹窗，前端校验与后端一致。
- Jest 测试：role 固定为 user、密码校验、改密码 404/403/400，共 12 个全通过。

### 阶段 3：文档管理页迁移

- `AdminDocumentsWorkspace`：文档表格（文件名/所有者/状态/可见性/选择数）+ 删除确认弹窗。
- `/admin/documents` 接入 `AdminDocumentsWorkspace`。

### 阶段 4：登录落点与主界面入口

- 新增 `GET /api/auth/me`，返回 `{ id, email, role }`。
- 登录页无 `from` 参数时调用 `/api/auth/me`：admin → `/admin`，user → `/chat/new`。
- 有 `from` 参数时保持原目标不变。
- TopBar Admin 入口改为 Shield 图标 + 边框 badge 样式。

### 阶段 5：清理与验收

- 删除 `src/components/admin/AdminWorkspace.tsx`（已确认无引用）。
- `pnpm exec tsc --noEmit`：通过，0 错误。
- `pnpm exec jest`：83 个测试，81 个通过；2 个预存失败（`documents/[id]/reindex` 和 `documents/[id]/index`），与本 feature 无关。

## 已修复实现问题（阶段 6）

以下问题在阶段 1–5 完成后经分析发现，并已在阶段 6 修复：

| #   | 问题                                                                       | 类型      | 影响文件                                                                                   |
| --- | -------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| 1   | Admin UI 全部使用中文，与主应用英文风格不一致                              | 实现 BUG  | AdminSidebar、AdminTopBar、AdminUsersWorkspace、AdminDocumentsWorkspace、admin/\*/page.tsx |
| 2   | Chat 界面 Sidebar footer 无 Admin 入口（ChatSidebarContent 未加 Admin 项） | 需求遗漏  | ChatSidebar/index.tsx                                                                      |
| 3   | TopBar Admin 按钮在 `hidden md:flex` nav 内，移动端不可见                  | 需求遗漏  | TopBar.tsx                                                                                 |
| 4   | auth-context 无 email 字段；TopBar SignOut 旁无 Email 显示                 | 新功能    | auth-context.tsx、providers.tsx、TopBar.tsx、AdminTopBar.tsx                               |
| 5   | 创建用户使用内联表单，未使用 Dialog；前端无 Zod 错误显示                   | 功能调整  | AdminUsersWorkspace.tsx                                                                    |
| 6   | AdminDocumentsWorkspace 文档为空时不渲染表格，直接返回段落文本             | 实现 BUG  | AdminDocumentsWorkspace.tsx                                                                |
| 7   | AppSidebar Admin isActive 判断为精确匹配 `/admin`，子页时不激活            | minor bug | AppSidebar.tsx                                                                             |

### 阶段 6：UI 完善与缺陷修复

- 新增 `src/lib/validations/admin.ts`：前后端共享 Zod schema（`createUserSchema`）。
- `auth-context.tsx`：新增 `email` 字段；`AuthContextProvider` 接收 `initialEmail` prop；`onAuthStateChange` 同步 email。
- `providers.tsx`：新增 `email` prop，传入 `AuthContextProvider`。
- `src/app/layout.tsx`：传入 `email={profile?.email ?? null}` 到 Providers。
- `AdminShell.tsx`：接收 `email` prop 并传入 `AdminTopBar`。
- `admin/layout.tsx`：捕获 `requireAdmin()` 返回值，传 `email` 给 AdminShell。
- `AdminTopBar.tsx`：接收 `email` prop，"回到 FAQ" → "Back to FAQ"，SignOut 左侧显示 email（小屏隐藏），tooltip 含 email。
- `AdminSidebar.tsx`：导航标签全部英文化（Dashboard / Users / Documents）。
- `TopBar.tsx`：Admin 按钮移至右侧常驻操作区（移出 `hidden md:flex` nav）；SignOut 左侧显示 email（小屏隐藏）；SignOut tooltip 含 email。
- `ChatSidebar/index.tsx`：引入 `useAuth`，SidebarFooter 末尾添加 Admin 项（仅 admin 可见）。
- `AppSidebar.tsx`：Admin isActive 修正为 `pathname.startsWith("/admin")`。
- `AdminUsersWorkspace.tsx`：创建用户改为 Dialog 弹窗，前端 Zod 校验并显示具体错误；全部 UI 文本英文化。
- `AdminDocumentsWorkspace.tsx`：移除空状态 early return，改为表格占位行 "No documents found."；全部 UI 文本英文化。
- `admin/page.tsx`：全部 UI 文本英文化，空状态改为表格占位行。
- `admin/users/page.tsx`：页面标题英文化（Users）。
- `admin/documents/page.tsx`：页面标题英文化（Documents）。
- `api/admin/users/route.ts`：改为从 `@/lib/validations/admin` 引入共享 schema。

## 验证状态

- `pnpm exec tsc --noEmit`：通过（0 错误）。
- `pnpm exec jest`：81/83 通过；2 个预存失败（reindex/index API tests，与本 feature 无关）。
- 人工验证：待进行（见验收清单）。

## 验收清单（待阶段 6 修复后验证）

- [ ] admin 访问 `/admin` 显示 Dashboard（统计卡片 + 最近文档），管理界面专属 shell，无主应用 TopBar/AppSidebar
- [ ] admin 访问 `/admin/users` 可通过 Dialog 创建（含 Zod 错误提示）、删除、改密码
- [ ] admin 访问 `/admin/documents` 可删除文档；空时显示 "No documents found." 占位行
- [ ] 管理界面 "Back to FAQ" 按钮跳转到主界面
- [ ] 管理界面顶部显示 "FAQ-RAG Admin" 标题
- [ ] 普通用户直接访问 `/admin`、`/admin/users`、`/admin/documents` 被重定向到 `/chat/new`
- [ ] admin 普通登录（无 from 参数）后跳转到 `/admin`
- [ ] 普通用户登录（无 from 参数）后跳转到 `/chat/new`
- [ ] 带 `from=/knowledge` 登录后回到 `/knowledge`
- [ ] 主界面 TopBar 右侧常驻区 Admin 按钮所有屏幕尺寸可见，普通用户不可见
- [ ] Chat 界面 Sidebar 底部有 Admin 入口，普通用户不可见
- [ ] TopBar SignOut 左侧显示 Email（小屏隐藏）；SignOut tooltip 含 Email
- [ ] Admin 界面所有 UI 文本使用英文
- [ ] 主界面 Chat / Knowledge / About 及 Sign In 页正常渲染（无回归）

## 下一步

完成阶段 6 所有修复后，进行人工验收。全部验收通过后，此 feature 可合并到 main。

## 恢复协议

恢复此 feature 时：

1. 先读取本文件（PROGRESS.md）。
2. 再读取 [DESIGN.md](./DESIGN.md)（规范版；如不存在，读 DESIGN-codex.md）。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status` 和 `git log`，与"最后确认的实现提交"（`c6b6f17`）对比，确认是否有新的 admin-ui 相关提交。
5. 检查 `REQUIREMENTS.md`、`DESIGN.md` 或本文件是否在最后确认进度之后发生变化。
6. 如果需求、设计、范围、阶段顺序或验收标准发生冲突，先停下说明不一致。
7. 每次阶段或子阶段提交前，按实际实现状态更新本文件。
8. DESIGN-codex.md 和 PROGRESS-codex.md 是 Codex 生成的参考版本，实施时以 DESIGN.md 和 PROGRESS.md 为准，不修改 codex 版本。
