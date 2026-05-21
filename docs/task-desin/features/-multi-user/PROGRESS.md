# Multi-user 实施进度

## 当前状态

- 当前阶段：`2.14.9` post-review 修复
- 状态：已完成
- 最后确认的实现提交：`9662d42`（`multi-user phase 2.14.8: complete UI integration`）
- 最后确认的设计提交：`d072122`（`docs: phase multi-user implementation plan`）
- 进度文档状态：阶段 `2.14.8` 已完成；`2.14.9` 根据 REVIEW.md 代码评审结果新增，修复架构合规和权限安全问题
- 下一步入口：完整三账号 Playwright E2E（见"下一步"节）/ 需求类改进按产品决策另行处理

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`

当前工作区应保持干净后再做后续维护。

## 历史提交映射

- `e1f82da` `docs: add multi-user feature requirements`
  - 新增产品需求来源：`Docs/FEATURE-multi-user.md`，现已迁移为 `docs/features/-multi-user/REQUIREMENTS.md`。
- `8d1d620` `docs: add multi-user design`
  - 新增初版技术设计：`Docs/DESIGN-multi-user.md`，现已迁移为 `docs/features/-multi-user/DESIGN.md`。
- `d072122` `docs: phase multi-user implementation plan`
  - 增加分阶段实施、迁移、测试、风险和发布策略。
- `97a561f` `feat: add multi-user data foundation`
  - 实施阶段 `2.14.1` 基础：Prisma schema 变更、多用户 migration、seed 脚本，以及 session 创建路径的临时默认 admin 兼容。
- `a134f03` `feat: add auth and data access foundations`
  - 实施阶段 `2.14.2` 基础：auth helpers、初始数据访问层，以及 chat/knowledge 页面数据访问收敛。
- `80e4ce7` `feat: isolate chat sessions by user`
  - 实施阶段 `2.14.3`：session API 用户隔离，并增加 session API 测试。
- `ca4bb90` `multi-user phase 2.14.4: isolate document owner APIs`
  - 实施阶段 `2.14.4`：文档上传、列表、删除、index、reindex API 按当前用户归属隔离，并允许管理员写入全站文档。
- `6e084db` `multi-user phase 2.14.5: filter retrieval by user`
  - 实施阶段 `2.14.5`：chat API 从当前用户推导 retrieval 权限上下文，vector search 只检索 owner 文档和已选择的 public 文档。
- `b3c0ee1` `multi-user phase 2.14.6: add public document selection`
  - 实施阶段 `2.14.6`：公开文档列表、选择/取消选择 API、文档 visibility 更新，以及 Knowledge 页面公开文档选择交互。
- `845d97d` `multi-user phase 2.14.7: add admin management APIs`
  - 实施阶段 `2.14.7`：管理员用户/文档 API、共享删除 service、用户删除清理流程，以及只读 Admin 页面入口。
- `9662d42` `multi-user phase 2.14.8: complete UI integration`
  - 实施阶段 `2.14.8`：管理员导航、Admin 创建/删除确认 UI、登录页默认账号选择、Knowledge 分区标题和基础 Playwright 验收。

历史 commit message 不做 rewrite。本映射作为既往 multi-user 工作的恢复来源。

## 阶段清单

- [x] `2.14.1` 数据模型和默认用户基础
- [x] `2.14.2` 认证授权和数据访问层
- [x] `2.14.3` 聊天记录隔离
- [x] `2.14.4` 文档归属和私有隔离
- [x] `2.14.5` 问答检索权限过滤
- [x] `2.14.6` 公开文档选择
- [x] `2.14.7` 管理员能力和清理流程
- [x] `2.14.8` UI 整合和端到端验收
- [x] `2.14.9` post-review 修复（delete-user 顺序、layout.tsx data 层、index/reindex data 层、守卫测试扩展）

## 已实施内容

- 在 Prisma model 中增加 `UserProfile`、`UserRole`、`DocumentVisibility` 和 `PublicDocumentSelection`。
- 增加多用户基础 migration 和默认演示用户 seed 脚本。
- 增加 `requireUser()`、`requireAdmin()`，并通过 Supabase Auth 和 `UserProfile` 获取当前业务用户。
- 增加 `src/lib/data/sessions.ts` 和 `src/lib/data/documents.ts`。
- 更新 chat 和 knowledge server page，改为使用当前用户的数据访问 helper。
- 更新 session API routes，要求当前用户，并按 `userId` 隔离 list/get/create/update/delete。
- 增加 session API 隔离测试。
- 更新文档上传准备接口，要求当前用户，并把新文档归属写入当前用户。
- 更新文档列表接口，默认只分页返回当前用户自己的文档。
- 为文档 delete、index、reindex API 增加 owner/admin 写权限检查。
- 增加文档 API 聚焦测试，覆盖当前用户归属、同用户重复 hash、列表隔离、删除和索引授权路径。
- 更新 `POST /api/chat`，要求当前用户，并把当前用户 `userId` 传入 retrieval。
- 更新 `retrieve()` / `vectorSearch()` 签名，强制接收当前用户上下文。
- 更新 vector search SQL，只允许当前用户自己的 indexed 文档，以及当前用户已选择且仍为 public 的 indexed 文档进入检索。
- 将 `src/lib/retrieval/*` 测试纳入 Jest，并增加 retrieval 权限传参和 SQL 过滤测试。
- 更新 retrieval eval 脚本，默认使用演示 admin 用户，也支持通过 `EVAL_USER_ID` 指定评测用户。
- 增加 `src/lib/data/public-documents.ts`，封装公开文档列表、选择和取消选择逻辑。
- 增加 `GET /api/public-documents`，返回其他用户 public indexed 文档，并标记当前用户是否已选择。
- 增加 `POST/DELETE /api/public-documents/[id]/selection`，支持选择和取消选择公开文档。
- 增加 `PATCH /api/documents/[id]`，允许文档 owner 修改自己的 visibility；改为 private 时删除该文档 selection。
- 更新 Knowledge 页面，展示自己的文档 visibility 控件和其他用户公开文档选择表。
- 增加聚焦测试，覆盖公开文档列表过滤、选择约束、取消选择和 public 改 private 清理 selection。
- 增加 `src/lib/data/users.ts`，封装用户列表和业务资料创建查询。
- 增加 `src/lib/services/create-user.ts`、`delete-user.ts` 和 `delete-document.ts`，集中处理 Supabase Auth、业务数据和 storage 清理。
- 更新普通文档删除 API，复用共享文档删除 service。
- 增加 `/api/admin/users`、`/api/admin/users/[id]`、`/api/admin/documents` 和 `/api/admin/documents/[id]`。
- 增加只读 `/admin` 页面入口，管理员可查看用户和全站文档概览。
- 增加管理员 API 和清理 service 测试，覆盖 requireAdmin、禁止删除自己、storage 删除失败时继续删除数据库记录。
- 更新 auth context、TopBar 和 Sidebar，管理员登录后展示 Admin 入口。
- 更新登录页，展示并可一键填入 `admin@test.com`、`user1@test.com`、`user2@test.com` 三个默认账号。
- 更新 `/admin` 页面，支持创建普通用户、删除用户确认和删除全站文档确认。
- 更新 Knowledge 页面文档区标题，明确区分 My documents 和 Public documents。
- 增加登录页默认账号 E2E 覆盖，并运行基础 Playwright 验证。

## 已知不一致

- CLI/API ingest helper 路径仍使用 `DEFAULT_ADMIN_USER_ID`，当前保留为本地/脚本导入工具边界，不作为用户上传路径。
- 完整三账号端到端业务验收未自动化运行；当前覆盖为 API/Jest、基础 Playwright 和人工验收清单。
- `delete-user.ts` 操作顺序已在 `2.14.9` 修正为 storage → auth → db，与 DESIGN.md 2.10.2 一致。
- `src/app/layout.tsx` 已在 `2.14.9` 改用 `getCurrentUser()`，移除直接 Prisma 调用。`page-db-access.test.ts` 已扩展覆盖 `layout.tsx`。
- `src/app/api/documents/[id]/index/route.ts` 和 `reindex/route.ts` 已在 `2.14.9` 改用 data 层函数 `setDocumentUploaded` / `resetDocumentForReindex`。

## 下一步

后续维护入口：

1. 如需要发布前更强保证，补充需要真实 Supabase/LLM/Storage 环境的三账号 Playwright 流程。
2. 如 CLI ingest 需要面向多用户开放，将脚本参数化为显式 `userId`，并禁止默认 admin 隐式写入。
3. 根据实际演示反馈微调 Admin 和 Knowledge 移动端表格密度。

## 验证状态

- `pnpm exec tsc --noEmit`：通过。
- `pnpm exec jest --runInBand`：通过，25 个测试套件 / 77 个测试。
- `pnpm exec playwright test e2e/basic.test.ts --project=chromium`：通过，2 个测试。
- `pnpm build`：通过；Turbopack 输出 Prisma/NFT tracing warning，不阻塞构建。
- `pnpm test -- --runInBand`：未执行测试；该项目脚本会把 `--runInBand` 当作 Jest pattern，返回 No tests found。
- 完整三账号 E2E：未运行。

后续维护前，如需确认实现基线，应从相关提交恢复验证结果，或重新运行必要测试。

## 恢复协议

恢复此 feature 时：

1. 从最新提交读取本文件。
2. 检查 `git status`。
3. 检查 `Last confirmed implementation commit` 之后的提交。
4. 检查 `DESIGN.md` 或 `REQUIREMENTS.md` 是否在最后确认进度之后发生变化。
5. 如果影响流程的文档变化没有反映到本文件，暂停实施，先刷新 feature 文档。
6. 只检查当前阶段或不一致点所必需的代码路径。
7. 每次阶段或子阶段提交前更新本文件。

## 更新规则

以下情况需要更新本文件：

- 阶段或子阶段开始、完成或有意跳过。
- 下一步实施入口发生变化。
- 测试或验证状态发生变化。
- 发现或解决已知不一致、阻塞问题。
- 需求或设计变化影响实施流程。

无关变更不更新本文件。只有技术设计变化时才更新设计文档，只有产品需求变化时才更新需求文档。
