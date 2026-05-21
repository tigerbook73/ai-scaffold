# knowledge-ui-layout 需求

> 状态：**已确认，待实现**
> feature-id: knowledge-ui-layout

---

## 1. 目标

优化 `/knowledge` 页面的信息架构、移动端可用性和文档管理操作体验，将页面从“上传区 + 两张表纵向堆叠”调整为更清晰的 Knowledge 工作区。

---

## 2. 当前问题

1. 上传区、My documents、Public documents 连续堆叠，移动端首屏任务边界不清晰。
2. My documents 工具栏中的 search、refresh、Rebuild All 在移动端布局拥挤；search 当前价值有限。
3. My documents 表格在移动端隐藏部分列后，visibility 被放进 status 单元格，`private` / `public` 容易换行。
4. My documents 行内同时出现 visibility select、reindex、delete，操作密度过高。
5. Public documents 后端已经只返回 indexed 公有文档，UI 继续展示 status 列是冗余信息。
6. Public documents 的 Selection 用按钮表达，不如 switch/toggle 直观。
7. My documents 和 Public documents 的 subtitle 信息量低，占用移动端垂直空间。

---

## 3. 期望行为

### 3.1 Tab 化工作区

- `/knowledge` 使用两个 tab 分离访问：
  - `My documents`
  - `Public documents`
- 默认打开 `My documents`。
- 刷新页面后仍默认打开 `My documents`，不需要记住上次选择的 tab。
- `UploadZone` 只在 `My documents` tab 内展示。

### 3.2 紧凑标题和工具栏

- 移除 My documents 和 Public documents 的低价值 subtitle。
- 标题区域可展示文档数量，例如 `My documents` + `12 documents`。
- My documents search 桌面端保留，移动端隐藏。
- Public documents search 桌面端保留，移动端隐藏。
- My documents 保留 refresh icon button。
- `Rebuild All` 作为低频/高风险操作，统一放入 My documents header 的 More 菜单。
- 当 `Rebuild All` 正在执行时，header 右侧展示紧凑进度文本，例如 `Rebuilding 2/8`；More 菜单中的 `Rebuild All` 菜单项 disabled，不通过拉长菜单项文案承载进度。

### 3.3 My documents 行操作

- My documents 每行将低频操作统一收进 Actions 菜单：
  - `Make public` / `Make private`
  - `Reindex`
  - `Delete`
- 桌面端和移动端都统一使用 Actions 菜单，不再把 visibility、reindex、delete 作为行内直出控件。
- `Make public` / `Make private` 沿用现有 PATCH 行为，所有文档状态均允许触发；请求期间对应菜单项 disabled。
- `Reindex` 仅在 `indexed` / `failed` 状态可触发。对其他状态，Actions 菜单中不展示 `Reindex`，避免用户误以为可重新索引中间态文档。
- `Delete` 沿用现有行为，所有文档状态均允许触发，并继续通过确认 dialog 防误删。
- 移动端不再把 visibility select 放入 status 单元格。
- 行内优先展示名称、状态、visibility 摘要和 metadata。

### 3.4 Public documents 选择体验

- Public documents 只展示 indexed 公有文档。
- UI 不展示 status 列。
- Selection 改为 switch/toggle，表达该公有文档是否用于当前用户检索。
- Switch/toggle 必须有可访问名称，例如 `Use "${doc.name}" for retrieval`。

### 3.5 移动端列表

- 移动端使用 stacked row 布局，而不是继续压缩表格列。
- `md` 以下使用 stacked row，`md` 及以上保留 table。
- 不通过缩小字体来塞下所有列。
- 关键操作目标应保持适合触控。

### 3.6 UploadZone 紧凑化

- `UploadZone` 只出现在 `My documents` tab。
- 不根据当前是否已有文档切换布局。
- 移动端使用一行紧凑上传入口：左侧简短文案，右侧 `Upload` 视觉按钮。
- 桌面端仍保留 drag and drop 能力，但使用紧凑高度，避免挤占文档列表空间。
- 上传中禁用入口并显示简短 uploading 文案；不展示 progress bar。

### 3.7 空状态文案

- My documents 空状态文案改为 `No documents yet. Upload a file to get started.`
- 空状态文案不得依赖 `above`、`below` 等相对位置描述，因为 UploadZone 位于 tab 内容内，后续布局可能调整。

### 3.8 可访问性

- Tabs 必须提供正确的 tablist / tab / tabpanel 语义和键盘导航。
- More / Actions icon button 必须有可访问名称。
- Public documents switch 必须有可访问名称。
- 交互控件在移动端应保持可触控尺寸，不通过缩小字号牺牲可用性。

---

## 4. 不在范围内

- 公有文档权限模型调整。
- 公有文档搜索、筛选、排序的完整高级查询系统。
- Rebuild All 后端批处理语义调整。
- 上传、索引、检索 API 的数据模型大改。
- `knowledge-upload` 的上传后即时显示和轮询体验优化。

---

## 5. 验收标准

- [ ] 移动端 `/knowledge` 首屏展示 My documents / Public documents tabs。
- [ ] `UploadZone` 只在 My documents tab 出现。
- [ ] `UploadZone` 在移动端和已有文档场景下完成紧凑化。
- [ ] My documents 和 Public documents 的 subtitle 被移除或替换为紧凑数量信息。
- [ ] My documents 和 Public documents 的 search 桌面端保留、移动端隐藏。
- [ ] My documents 移动端不再出现 visibility 控件挤入 status 单元格导致换行的问题。
- [ ] My documents 每行可从 Actions 菜单完成 visibility、reindex、delete 操作。
- [ ] `Rebuild All` 统一位于 My documents header More 菜单中。
- [ ] Rebuild All 执行中时 header 显示 `Rebuilding done/total` 紧凑进度，More 菜单项 disabled。
- [ ] Public documents 不展示 status 列，且列表内容仅包含 indexed 公有文档。
- [ ] Public documents 的选择状态使用 switch/toggle，可直接启用或停用检索。
- [ ] `md` 以下使用 stacked row，`md` 及以上保留 table；移动端文档行信息可读，不依赖缩小字体来塞下所有表格列。
- [ ] My documents 空状态文案为 `No documents yet. Upload a file to get started.`
- [ ] Tabs、Switch、More 菜单和 Actions 菜单满足基础可访问性要求。
