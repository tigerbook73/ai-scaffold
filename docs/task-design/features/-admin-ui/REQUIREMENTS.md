# admin-ui 需求

> 状态：**草稿，待确认**
> 原 feature-id: admin-pagination（功能范围已扩大，建议重命名为 admin-ui）

---

## UI 语言约定

管理界面所有 UI 文本（按钮、表头、提示信息、弹窗内容）使用**英文**，与主应用（Chat / Knowledge / About / Sign In）保持一致。

---

## 1. 目标

将现有的 `/admin` 页面（单页滚动布局）改造为独立的管理界面，与主应用界面形成清晰的功能分区。管理员拥有专属的管理工作区，可在管理界面和普通用户界面之间自由切换，但两者的导航结构完全分离。

---

## 2. 角色

| 角色     | 访问范围                                               |
| -------- | ------------------------------------------------------ |
| 普通用户 | 主界面（Chat / Knowledge / About），不可见任何管理入口 |
| 管理员   | 主界面 + 管理界面，两者均可访问                        |

---

## 3. 管理界面

### 3.1 路由与布局

- 管理界面路由前缀：`/admin`，拥有独立的 Next.js layout（`src/app/admin/layout.tsx`）。
- 管理界面有专属的顶部导航栏（TopBar）和左侧垂直导航，与主界面的 TopBar / AppSidebar 完全独立。
- 管理界面顶部显示标题：**FAQ-RAG Admin**。

### 3.2 管理界面侧边导航

管理界面左侧有专属垂直导航（风格与主界面左侧侧边栏保持一致），包含：

| 导航项    | 路由               | 说明                   |
| --------- | ------------------ | ---------------------- |
| Dashboard | `/admin`           | 概览信息（Dashboard）  |
| Users     | `/admin/users`     | 用户列表、创建、删除   |
| Documents | `/admin/documents` | 全站文档列表、删除文档 |

### 3.3 返回主界面按钮

- 管理界面顶部导航栏有明显的 **"Back to FAQ"** 按钮（或链接）。
- 点击后跳转到主界面（`/chat/last` 或 `/chat/new`），体验与普通用户完全一致。

### 3.4 用户管理页（`/admin/users`）

- 展示全部用户列表：Email、Role、Joined（注册日期）。
- 创建新用户（邮箱 + 密码 + 默认 role=user）通过 **Dialog 弹窗**进行；前端使用 Zod 校验邮箱格式和密码（与后端共享同一 schema，密码最少 6 位），并显示具体错误信息。
- 删除用户（含二次确认弹窗），不能删除自己。
- 支持修改用户密码，不支持修改其他属性。
- 暂不支持分页。

### 3.5 文档管理页（`/admin/documents`）

- 展示全站文档列表：Filename、Owner、Status、Visibility、Selections。
- 无文档时仍显示表格框架，内有 **"No documents found."** 占位行。
- 删除文档（含二次确认弹窗）。
- 暂不支持分页。

### 3.6 管理界面落点

- 管理员访问 `/admin`（根路径）时，显示概览仪表板（Dashboard）。
- 管理员登录后（首次登录）：
  - 若从普通登录流程进入，跳转到 `/admin`（管理界面）。
  - 若因访问某 URL 被重定向到登录页，则登录后回到原目标页面。

---

## 4. 主界面中的管理入口

### 4.1 TopBar Admin 按钮

- Admin 按钮位于主界面 TopBar **右侧常驻操作区**（主题切换 / SignOut 按钮旁），在所有屏幕尺寸下均可见，不依赖仅在中屏及以上显示的 nav 区域。
- 仅 admin 用户可见，普通用户不可见。
- 样式：带 `Shield` 图标的 badge 风格，跳转到 `/admin`。

### 4.2 Chat Sidebar Admin 入口

- 当 admin 用户在主界面 Chat 视图时，左侧 ChatSidebar 底部导航区（footer）包含 **Admin** 入口项，位于 About 之后（最底部）。
- 仅 admin 用户可见。

### 4.3 普通用户体验不变

主界面中不显示任何 admin 相关入口，导航、侧边栏、功能与现有普通用户体验完全一致。

### 4.4 用户信息显示

- 主界面 TopBar 的 SignOut 按钮左侧显示当前登录用户的 Email（小屏幕隐藏，`hidden sm:inline`）。
- SignOut 按钮 tooltip（`title` 属性）同样包含 Email，方便用户确认当前账号。
- Admin 界面 AdminTopBar 的 SignOut 按钮同理。

---

## 5. 不在范围内

- 文档搜索 / 过滤（另行计划）。
- 文档排序（另行计划）。
- 设置页（不实现，不预留路由）。
- 角色升降级（不支持；除密码外，不支持修改用户任何关键属性）。
- 区分 Admin / 普通用户的登录页（同一登录页，按角色区分登录后落点）。
- 审计日志。

---

## 6. 验收标准

- [ ] 访问 `/admin` 显示概览仪表板（Dashboard）。
- [ ] `/admin/users` 页面展示用户列表（Email、Role、Joined），支持创建和删除用户。
- [ ] 创建用户通过 Dialog 弹窗进行，前端 Zod 校验邮箱格式和密码并显示具体错误信息（与后端 schema 一致）。
- [ ] 用户管理页支持修改用户密码。
- [ ] `/admin/documents` 页面展示全站文档，支持删除；空时显示 "No documents found." 占位行。
- [ ] 管理界面有 "Back to FAQ" 按钮，点击回到主界面，体验与普通用户一致。
- [ ] 主界面 TopBar 右侧常驻区 admin 用户可见 Admin 按钮，普通用户不可见，所有屏幕尺寸下均可见。
- [ ] Chat 界面 Sidebar 底部 admin 用户可见 Admin 入口，普通用户不可见。
- [ ] TopBar SignOut 按钮左侧显示 Email（小屏隐藏）；SignOut tooltip 含 Email。
- [ ] 管理界面顶部显示 "FAQ-RAG Admin" 标题。
- [ ] 非 admin 用户直接访问 `/admin/**` 被重定向到主界面（或 403）。
- [ ] 管理员普通登录后跳转到 `/admin`；因重定向进入登录页时，登录后回到原目标页面。
- [ ] Admin 界面 UI 文本（按钮、表头、提示、弹窗）全部使用英文。
