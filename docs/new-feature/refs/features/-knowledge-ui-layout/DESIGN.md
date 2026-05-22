# knowledge-ui-layout 设计

## 1. 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

---

## 2. 现状分析

当前 `/knowledge` 页面由 `src/app/knowledge/page.tsx` 直接顺序渲染：

```text
UploadZone
DocumentTable
PublicDocumentTable
```

主要组件：

| 文件 | 当前责任 |
| --- | --- |
| `src/app/knowledge/page.tsx` | 渲染 Knowledge 页面结构 |
| `src/components/knowledge/UploadZone.tsx` | 上传入口和上传进度 |
| `src/components/knowledge/DocumentTable/index.tsx` | My documents 标题、搜索、刷新、Rebuild All、表格和 dialogs |
| `src/components/knowledge/DocumentRow.tsx` | My documents 单行，包含 status、visibility、reindex、delete |
| `src/components/knowledge/PublicDocumentTable.tsx` | Public documents 搜索、表格、selection button |

后端 `listSelectablePublicDocuments()` 已过滤：

```ts
visibility: "public"
status: "indexed"
```

因此 Public documents UI 中的 status 列不是必要信息。

---

## 3. 信息架构

将页面调整为 tab 工作区：

```text
Knowledge
[ My documents | Public documents ]

My documents:
  UploadZone
  Header actions
  My documents list/table

Public documents:
  Header actions
  Public documents list/table
```

默认打开 `My documents`。刷新页面后仍默认打开 `My documents`，不需要通过 URL、query string 或 localStorage 记住上次选择的 tab。

`UploadZone` 只在 `My documents` tab 内展示。

---

## 4. 组件边界

建议新增 workspace 组件承载 tab 状态：

| 文件 | 责任 |
| --- | --- |
| `src/app/knowledge/page.tsx` | 保持 server page，渲染 `PageShell` 和 workspace |
| `src/components/knowledge/KnowledgeWorkspace.tsx` | `"use client"` 组件；管理 tabs，决定展示 `UploadZone`、`DocumentTable`、`PublicDocumentTable` |
| `src/components/knowledge/DocumentTable/index.tsx` | My documents 标题、工具栏、桌面表格、移动端 stacked rows |
| `src/components/knowledge/DocumentRow.tsx` | My documents 单行展示和 Actions 菜单 |
| `src/components/knowledge/DocumentDialogs.tsx` | 继续承载 delete / rebuild dialogs；dialog open state 由 `DocumentTable` 管理 |
| `src/components/knowledge/useDocumentManagement.ts` | 继续管理 documents SWR、deleteTarget、reindexingId、visibilityUpdatingId、rebuild state |
| `src/components/knowledge/PublicDocumentTable.tsx` | Public documents 标题、桌面表格、移动端 stacked rows、selection switch |

`KnowledgeWorkspace` 必须是 client component，因为 tab 状态属于客户端交互状态。`src/app/knowledge/page.tsx` 保持 server page。

如项目尚无 tabs 或 switch 组件，优先使用 shadcn 生成对应组件；若 CLI 输出与当前 base-ui / Tailwind v4 风格不匹配，则按现有 `src/components/ui/*` 模式本地实现。不要为本 feature 新增传统 `tailwind.config.ts`。

More 菜单和 Actions 菜单使用项目已有 `DropdownMenu` 组件，trigger 使用 `MoreHorizontal` icon button，并提供可访问名称。

### 4.1 Dialog 和 action 状态边界

- `deleteTarget`、`rebuildDialogOpen`、`reindexingId`、`visibilityUpdatingId` 继续保留在 `DocumentTable` / `useDocumentManagement` 层。
- `DocumentRow` 不持有 dialog state，只通过 props 触发：
  - visibility update
  - reindex
  - delete request
- `DocumentDialogs` 继续由 `DocumentTable` 渲染，避免每一行重复挂载 dialog。
- Actions 菜单中的 disabled/loading 状态由 `useDocumentManagement` 暴露的 id/state 决定。

---

## 5. My documents 设计

### 5.1 工具栏

建议结构：

```text
My documents                         [refresh] [more]
12 documents
```

- 移除默认 search。
- search 在桌面端保留，在移动端隐藏。
- refresh 保留为 icon button，使用 `RefreshCw`。
- `Rebuild All` 统一放入 My documents header 的 More 菜单。
- rebuilding 期间在 header 中展示紧凑进度，例如 `Rebuilding 2/8`，不要撑开按钮文本。
- More 菜单中 `Rebuild All` 在 rebuilding 期间 disabled。

### 5.2 行操作

将 visibility、reindex、delete 收进每行 Actions 菜单：

- `Make public`：当前为 private 时显示。
- `Make private`：当前为 public 时显示。
- `Reindex`：仅 `indexed` 或 `failed` 状态显示并可用；`pending` / `uploaded` / `indexing` 不显示该菜单项。
- `Delete`：destructive 样式，继续复用确认 dialog。
- Visibility 和 Delete 沿用现有行为，允许所有文档状态触发；请求中的对应菜单项 disabled。

桌面端和移动端都统一使用 Actions 菜单。visibility、reindex、delete 都不是高频操作，不再作为行内直出控件展示。

### 5.3 桌面表格

建议列：

| 列 | 说明 |
| --- | --- |
| Name | 文件名，允许截断 |
| Status | status badge，failed 时展示错误摘要 |
| Visibility | badge 或菜单中状态摘要 |
| Chunks | chunk 数量；indexing 时显示 `done / total` |
| Uploaded | 桌面显示，移动端 metadata 显示 |
| Actions | 右对齐更多菜单 |

### 5.4 移动端 row

`md` 以下使用 stacked row，`md` 及以上保留 table。移动端 row：

```text
document-name.pdf                         [more]
[indexed] [private]
12 chunks · en · May 10
```

失败状态：

```text
document-name.pdf                         [more]
[failed] [public]
Embedding provider error...
```

实现采用同一 row 组件内两套 markup 并存：

- 移动端：`<div className="md:hidden">` 渲染 stacked row。
- 桌面端：`<TableRow className="hidden md:table-row">` 渲染 table row。

不使用 JS 条件渲染按 viewport 切换，避免 hydration 和状态迁移问题。

---

## 6. Public documents 设计

### 6.1 桌面表格

桌面端保留 search，移动端隐藏 search。移除 status 列。建议列：

| 列 | 说明 |
| --- | --- |
| Name | 公有文档名 |
| Owner | owner email |
| Lang | 语言 |
| Chunks | chunk 数量 |
| Use | selection switch/toggle |

### 6.2 移动端 row

`md` 以下使用 stacked row，`md` 及以上保留 table。

```text
public-doc-name.pdf                       [switch]
owner@example.com
12 chunks · en
```

### 6.3 Selection 控件

将当前 `Selected` / `Select` button 改为 switch/toggle：

- on：当前用户选择该公有文档参与检索。
- off：当前用户未选择。
- `aria-label` 使用 `Use "${doc.name}" for retrieval`。
- optimistic update 逻辑沿用当前 `handleSelectionChange(id, selected)`。
- updating 时禁用 switch，并在失败时回滚 SWR 数据并 toast。

### 6.4 数据加载与搜索状态

Tab 内容保持挂载，切换 tab 不主动卸载已访问内容。默认首屏只需要 My documents 可用；Public documents 接受 lazy 加载，首次切换到该 tab 时再发起 public 数据请求。

搜索状态由各表组件继续各自持有。由于 tab 内容保持挂载，切换 tab 后再切回时保留已输入的搜索词。

---

## 7. UploadZone 密度

`UploadZone` 移入 My documents tab 后，统一使用紧凑密度：

- 不根据当前是否已有文档切换布局。
- 移动端使用一行紧凑上传入口，左侧简短文案，右侧 `Upload` 视觉按钮。
- 桌面仍支持 drag and drop，但降低高度。
- 上传中禁用入口并显示简短 uploading 文案；不展示 progress bar。

本 feature 需要包含 UploadZone 紧凑化，不作为后续可选项。

---

## 8. 实施阶段

1. 新增/接入 tabs workspace，移动 `UploadZone` 到 `My documents` tab 内。
2. 移除两个列表 subtitle，添加紧凑标题和数量；调整 My documents toolbar 和 Rebuild All More 菜单。
3. 调整 `DocumentRow`：visibility、reindex、delete 收进 Actions 菜单，保留 table/dialog/hook 状态边界。
4. 调整 `PublicDocumentTable`：移除 status 列，selection 改 switch/toggle。
5. 为两张表添加移动端 stacked row 布局，桌面保留 table。
6. 紧凑化 `UploadZone`，尤其是移动端场景。

---

## 9. 验证策略

- `pnpm exec tsc --noEmit`
- 组件交互人工验证：
  - 切换 tabs。
  - My documents 上传后列表更新。
  - My documents visibility 切换、reindex、delete。
  - Public documents switch 选择/取消选择。
- 移动端视口验证：
  - `375x667`
  - `390x844`
  - `768x1024`
- 桌面视口验证：
  - `1280x800`
  - `1440x900`
