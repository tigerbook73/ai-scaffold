# knowledge-ui-layout 实施进度

## 当前状态

- 当前阶段：阶段 6 已完成
- 状态：阶段 6 代码已完成，并在后续 checkpoint 中进一步简化 header 与 UploadZone；类型检查、生产构建和 `/knowledge` 桌面/移动端视口确认均已完成
- 最后确认的实现提交：`4c02728 knowledge-ui-layout checkpoint: simplify headers and upload zone`
- 下一步入口：无；后续如调整 Knowledge UI，从新的产品或回归项开始

## 文档结构

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`（本文件）
- `REVIEW.md`

## 文档一致性检查

- 2026-05-10 创建 feature 文档，尚无实现提交，无一致性冲突。
- 2026-05-11 已处理 `REVIEW.md` 待确认点，并将决策写回 `REQUIREMENTS.md` / `DESIGN.md` / `PROGRESS.md`。
- 2026-05-11 阶段 1 实施：
  - 新增 `src/components/ui/tabs.tsx`，基于 Base UI Tabs 封装本地 Tabs 组件。
  - 新增 `src/components/knowledge/KnowledgeWorkspace.tsx`，默认打开 My documents。
  - `UploadZone` 和 `DocumentTable` 只在 My documents tab 内展示。
  - Public documents tab 首次切换时才挂载 `PublicDocumentTable`，之后 keep mounted 以保留状态。
  - `src/app/knowledge/page.tsx` 保持 server page，仅渲染 `PageShell` 和 `KnowledgeWorkspace`。
- 2026-05-11 阶段 2 实施：
  - My documents / Public documents subtitle 已移除，改为标题旁/下方紧凑数量信息。
  - My documents / Public documents search 已改为 `md` 及以上显示。
  - My documents refresh 保留为 icon button，并补充 `aria-label`。
  - `Rebuild All` 已移入 My documents More 菜单，rebuilding 时 header 显示 `Rebuilding done/total`，菜单项 disabled。
  - My documents 空状态文案已改为 `No documents yet. Upload a file to get started.`
- 2026-05-11 阶段 3 实施：
  - My documents 行级 visibility 不再使用 select，桌面 visibility 列改为只读 badge。
  - 每行新增 Actions 菜单，包含 `Make public/private`、`Reindex`、`Delete`。
  - `Reindex` 仅在 indexed / failed 状态显示，沿用现有 reindexing disabled 状态。
  - visibility 和 delete 沿用现有所有状态可操作策略，仅在对应 mutation pending 时 disabled。
  - `DocumentRow` 仍只通过 props 触发 action，不持有 dialog 或 mutation state。
- 2026-05-11 阶段 4 实施：
  - 新增 `src/components/ui/switch.tsx`，基于 Base UI Switch 封装本地 Switch 组件。
  - Public documents 移除 status 列。
  - Public documents selection button 改为受控 Switch，使用 `Use "${doc.name}" for retrieval` aria-label。
  - 保持现有 optimistic update、失败回滚和 pending disabled 行为。
- 2026-05-11 阶段 5 实施：
  - My documents table header 和完整 table row 改为 `md` 及以上展示。
  - My documents `md` 以下使用跨列 stacked row，展示名称、语言、chunks、visibility、status、uploaded date 和 Actions 菜单。
  - Public documents table header 和完整 table row 改为 `md` 及以上展示。
  - Public documents `md` 以下使用跨列 stacked row，展示名称、owner、语言、chunks 和 selection switch。
- 2026-05-11 阶段 6 实施：
  - `UploadZone` 不再读取 `/api/documents` 判断是否已有文档。
  - 移动端统一使用一行紧凑入口，左侧 `Add documents`，右侧 `Upload` 视觉按钮。
  - 桌面仍支持 drag and drop，但 padding 使用紧凑的 `md:p-4`。
  - 上传中禁用入口并显示 `Uploading...`，不展示 progress bar。
- 2026-05-11 checkpoint 实施（`4c02728`）：
  - 新增 `KnowledgeSectionTitle` 复用 My documents / Public documents 标题和数量布局。
  - 进一步简化 `UploadZone` 文案和视觉层级。
  - 同步更新 REQUIREMENTS / DESIGN / PROGRESS 以反映 header 与 upload zone 的最终布局。
- 2026-05-12 收尾：
  - 用户确认 `/knowledge` 桌面和移动端视口验证完成。
  - 将未提交的 `e2e/knowledge.test.ts` selector 精确化改动归档到本 feature，作为 Knowledge table E2E 稳定性处理。
- 本 feature 独立于 `knowledge-upload`；不要修改 `docs/features/knowledge-upload/*` 来记录本 feature 的 UI layout 规划。
- 实施前需确认 tabs 和 switch 组件是否已存在；若不存在，优先使用 shadcn 生成，输出不匹配时按 `src/components/ui/*` 现有风格新增。
- 2026-05-10 用户已确认关键取舍：
  - tabs 刷新后默认打开 My documents，不记住上次 tab。
  - My documents 和 Public documents 的 search 桌面保留、移动端隐藏。
  - My documents 行操作在桌面和移动端都统一收进 Actions 菜单。
  - `Rebuild All` 统一放入 My documents header More 菜单。
  - 本 feature 包含 UploadZone 紧凑化。
  - `md` 以下使用 stacked row，`md` 及以上保留 table。
  - `Rebuild All` 进度在 header 右侧展示 `Rebuilding done/total`，More 菜单项 disabled。
  - Actions 菜单：visibility 和 delete 沿用现有所有状态可操作；reindex 仅 indexed / failed 显示。
  - `DocumentTable` / `useDocumentManagement` 继续持有 dialog 和 mutation state；`DocumentRow` 只触发 action。
  - Public documents lazy 加载；tab 内容保持挂载，切回时保留搜索状态。
  - More / Actions 使用已有 `DropdownMenu`；Public selection 使用 Switch，并提供 aria-label。

## 阶段清单

- [x] 阶段 1：Knowledge workspace tabs 和 UploadZone 分区
- [x] 阶段 2：列表标题、数量和 My documents toolbar
- [x] 阶段 3：My documents Actions 菜单
- [x] 阶段 4：Public documents status 移除和 selection switch
- [x] 阶段 5：移动端 stacked rows
- [x] 阶段 6：UploadZone 紧凑化和视口验证

## 阶段 1 计划：Knowledge workspace tabs 和 UploadZone 分区

1. 检查项目是否已有 tabs 组件。
2. 新增 `KnowledgeWorkspace` 或在页面内接入 tabs。
3. 将 `UploadZone` 只放入 `My documents` tab。
4. 默认打开 `My documents`，刷新后不记住上次 tab。
5. 确认桌面和移动端切换 tabs 后布局稳定。

## 阶段 2 计划：列表标题、数量和 My documents toolbar

1. 移除 My documents subtitle。
2. 移除 Public documents subtitle。
3. 添加紧凑标题和数量。
4. My documents search 桌面保留、移动端隐藏。
5. Public documents search 桌面保留、移动端隐藏。
6. 保留 My documents refresh icon button。
7. 将 `Rebuild All` 移到 header More 菜单；rebuilding 时 header 显示 `Rebuilding done/total`。

## 阶段 3 计划：My documents Actions 菜单

1. 将 visibility、reindex、delete 在桌面和移动端都收进每行 Actions 菜单。
2. `DocumentRow` 仅通过 props 触发 action，不持有 dialog state。
3. `DocumentTable` / `useDocumentManagement` 继续管理 deleteTarget、reindexingId、visibilityUpdatingId、rebuild state。
4. visibility 和 delete 沿用现有所有状态可操作；reindex 仅 indexed / failed 显示。

## 阶段 4 计划：Public documents selection 优化

1. 移除 status 列。
2. 将 selection button 改为 switch/toggle。
3. Switch 使用 `Use "${doc.name}" for retrieval` aria-label。
4. 保持现有 optimistic update 和失败回滚行为。
5. Public documents lazy 加载；tab 内容保持挂载以保留搜索状态。

## 阶段 5 计划：移动端 stacked rows

1. 为 My documents 添加 `md` 以下 stacked row。
2. 为 Public documents 添加 `md` 以下 stacked row。
3. `md` 及以上保留 table。
4. 同一 row 组件内并存 `md:hidden` 移动端 markup 与 `hidden md:table-row` 桌面 markup。
5. 验证移动端无明显文本挤压、换行错位或操作目标过小。

## 阶段 6 计划：UploadZone 紧凑化和视口验证

1. 不根据当前是否已有文档切换布局。
2. 移动端使用一行紧凑上传入口，左侧简短文案，右侧 `Upload` 视觉按钮。
3. 桌面保留 drag and drop，但降低高度。
4. 上传中禁用入口并显示简短 uploading 文案；不展示 progress bar。
5. 完成桌面和移动端视口验证。

## 验证状态

- `pnpm exec tsc --noEmit`：2026-05-11 阶段 1、阶段 2、阶段 3、阶段 4、阶段 5、阶段 6 通过。
- `pnpm build`：2026-05-11 通过；仍存在既有 Turbopack NFT import trace warnings，trace 指向 `next.config.ts` / generated Prisma client / `src/lib/db/client.ts` / `src/app/api/health/route.ts`，与本 UI feature 无关。
- `pnpm exec jest`：未执行；本次收尾只更新 feature 进度文档和 Playwright selector 稳定性。
- 人工验证：2026-05-12 用户确认 `/knowledge` 桌面和移动端视口验证完成。
- E2E 稳定性：2026-05-12 `e2e/knowledge.test.ts` selector 精确化改动已归档到本 feature，避免 Knowledge table 桌面/移动端并存 markup 时命中隐藏行或宽泛状态文本。

## 验收清单

- [x] 移动端 `/knowledge` 首屏展示 My documents / Public documents tabs。
- [x] `UploadZone` 只在 My documents tab 出现。
- [x] `UploadZone` 在移动端和桌面端统一使用紧凑布局，不按有无文档区分。
- [x] My documents 和 Public documents 的 subtitle 被移除或替换为紧凑数量信息。
- [x] My documents 和 Public documents 的 search 桌面保留、移动端隐藏。
- [x] My documents 行操作统一进入 Actions 菜单。
- [x] `Rebuild All` 统一位于 My documents header More 菜单。
- [x] Rebuild All 执行中时 header 显示紧凑进度，More 菜单项 disabled。
- [x] Public documents 不展示 status 列。
- [x] Public documents 使用 switch/toggle 管理 selection。
- [x] `md` 以下使用 stacked row，`md` 及以上保留 table；移动端文档行信息可读，不依赖缩小字体来塞下所有表格列。
- [x] My documents 空状态文案为 `No documents yet. Upload a file to get started.`
- [x] Tabs、Switch、More 菜单和 Actions 菜单满足基础可访问性要求。

## 恢复协议

恢复此 feature 时：

1. 先读取本文件（PROGRESS.md）。
2. 再读取 [DESIGN.md](./DESIGN.md)。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status` 和 `git log`，确认是否有相关实现提交。
5. 如果有实现提交，以实际代码为准，更新本文件的已完成工作。
