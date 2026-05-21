# knowledge-ui-layout Review Notes

> 日期：2026-05-10
> 状态：待用户确认后更新 REQUIREMENTS / DESIGN / PROGRESS

---

## 1. 原始 review 意见

### 1.1 需求文档（REQUIREMENTS.md）

#### 问题 1：UploadZone 紧凑化的定义不够清晰

需求 3.5 把 UploadZone 紧凑化夹在“移动端列表”章节里，逻辑位置偏移，容易被忽略。“更紧凑上传入口”是指缩小高度的 drop zone、还是一个纯按钮、还是折叠为一行？这个问题既没有线框图，也没有文字描述，设计文档也没有补足。实现时很容易做出与预期不符的结果。

#### 问题 2：Rebuild All 进度展示在需求里是空白

需求说 Rebuild All 移到 More 菜单，但当前实现里按钮文本会变成 `Rebuilding 2/8...`。这个进度展示在移到 More 菜单后怎么处理？设计文档提到“在 header 中展示紧凑进度”，但需求层面完全没有提，造成需求与设计不对齐。

#### 问题 3：Actions 菜单对中间态文档的处理未说明

需求 3.3 说 Reindex 仅 indexed 或 failed 可用，但对 pending / uploaded / indexing 状态的文档，Actions 菜单怎么处理？菜单项 disabled 还是根本不出现？只提了 Reindex 的前置条件，Delete 和 visibility 的前置条件也没有说清楚，例如 indexing 中的文档能不能删除？当前代码是允许的。

#### 问题 4：空状态措辞需要随 UploadZone 位置更新

当前 DocumentTable 空状态文案是 `No documents yet. Upload some files above.`，Tab 化之后 UploadZone 在同一个 tab 内而非 “above”，这个措辞需要调整。需求没有提，验收标准也没有覆盖。

#### 问题 5：完全没有可访问性要求

Tab 组件需要正确的 ARIA 角色（tablist / tab / tabpanel）和键盘导航。Public documents 的 switch 单独出现时没有可见文字标签，需要 aria-label。这些在需求和验收标准里都没有出现。

### 1.2 设计文档（DESIGN.md）

#### 问题 1：缺失 UI 组件未指定来源

项目 `src/components/ui/` 里没有 tabs 也没有 switch。设计只说“按现有约定新增”，但没有说是否用 shadcn CLI 安装，也没有指定组件名。建议明确：`pnpm dlx shadcn@latest add tabs switch`，避免实现者手写或选用不兼容的实现。

#### 问题 2：KnowledgeWorkspace 的 client boundary 未说明

设计说 `knowledge/page.tsx` 保持 server page，由它渲染 KnowledgeWorkspace。但 KnowledgeWorkspace 管理 tab 状态，必须是 `"use client"` 组件。目前 DocumentTable 和 PublicDocumentTable 也都已经是 client component，这个 server/client 边界虽然没有大问题，但设计没有明确说明，容易引起疑惑。

#### 问题 3：组件边界表漏掉了两个关键文件

Section 4 的表格没有列出 `DocumentDialogs.tsx` 和 `useDocumentManagement.ts`。这两个文件会被 Actions 菜单重构直接影响：

- `DeleteDialog` 目前由 DocumentTable 持有并渲染，Actions 菜单移到 DocumentRow 后，触发 delete 的代码在 Row 里，但 Dialog 的 state（deleteTarget）在 Table 里。这个 prop 传递链需要设计决策，而不是留给实现时自己想。
- `useDocumentManagement` 里的 reindexingId、visibilityUpdatingId 等状态管理方式在 Actions 菜单场景下是否还合适？

#### 问题 4：Tab 数据加载策略未明确

目前两张表各自通过 SWR 加载数据。Tab 化后，shadcn Tabs 的默认行为是不渲染未激活 tab 的内容，也就意味着 Public documents 的 SWR 请求只有在切换到该 tab 后才发起（lazy）。这会导致第一次切换有明显延迟。设计没有决策是接受 lazy 加载、还是在 KnowledgeWorkspace mount 时 eager 预取两张表的数据。这个 tradeoff 应该明确。

#### 问题 5：Stacked row 的 DOM 结构未说明

Section 5.4 给出了移动端 stacked row 的视觉示意，但没有说明实现方式。常见有两种：

- 方案 A（推荐）：同一组件里，`<div className="md:hidden">` 渲染 stacked row，`<TableRow className="hidden md:table-row">` 渲染桌面行，两套并存。
- 方案 B：条件渲染，移动端渲染 div，桌面渲染 TableRow。

建议明确选择方案 A，并说明 `md:hidden` / `hidden md:table-row` 的使用约定。

#### 问题 6：More 菜单和 Actions 菜单的组件未指定

设计多次提到 “More 菜单” 和 “Actions 菜单”，但没有说明使用哪个组件。项目已有 `dropdown-menu.tsx`，应明确写出“使用 DropdownMenu，trigger 为 MoreHorizontal icon button”，避免实现者重新造轮子。

#### 问题 7：实施步骤与 PROGRESS.md 阶段数不一致

设计 Section 8 列了 6 个步骤，PROGRESS.md 列了 4 个阶段，UploadZone 紧凑化被合并进阶段4（移动端 stacked rows）。这两件事工作量和性质都不同，放在同一阶段容易导致阶段边界不清晰。建议两份文档统一成相同的阶段划分。

### 1.3 次要改进建议

- 搜索状态在 tab 切换时的行为：用户搜索后切换 tab 再切回，搜索框是否保留？目前两张表各自持有 search state，Tab 化后自然是保留的（state 不销毁，除非 tab unmount）。如果 tab 内容 unmount，则 search state 会重置。这个行为应该明确是否符合预期。
- Public documents 数量为 0 时 tab 切换体验：如果某用户没有任何可选公有文档，切换到 Public documents tab 只看到空状态。是否需要在 tab label 旁加数量标记（如 Public documents (0)）？设计里没有决策。
- Switch 的 aria-label：Section 6.3 应该明确 switch 的 aria-label，例如 `aria-label={Use "${doc.name}" for retrieval}`。

### 1.4 Review 总结

最优先需要补充的是：

1. UploadZone 紧凑化的具体 UI 形态（需求 + 设计都要补线框图或文字规格）。
2. DocumentDialogs 和 useDocumentManagement 的边界决策（删除触发在 Row，Dialog state 在哪里）。
3. Tab 数据加载策略（lazy vs eager）。
4. 指定 Tabs 和 Switch 来自 shadcn。

其余问题可以在实施时逐步决策，但建议在开始阶段 1 前先把前两条补上，避免中途返工。

---

## 2. 初步答复意见

整体判断：review 合理。尤其最优先的 4 条确实应该补进文档，否则实现时容易出现分歧：

- UploadZone 紧凑化具体形态。
- Actions 菜单与 Dialog / hook 状态边界。
- Tab 数据加载策略。
- Tabs / Switch / DropdownMenu 组件来源和可访问性要求。

本地核对结果：`src/components/ui` 里没有 `tabs` 和 `switch`，已有 `dropdown-menu`。

### 2.1 待确认决策

1. UploadZone 紧凑化形态：
   - 建议：有文档时，移动端改为“一行上传入口”：左侧简短文案，右侧 `Upload` 按钮；桌面仍保留较小高度 dropzone。
   - 空文档时保留更明显的 dropzone。
2. Rebuild All 进度：
   - 建议：`Rebuild All` 入口在 More 菜单；rebuilding 时 header 右侧显示 `Rebuilding 2/8` 文本，More 菜单项 disabled。
3. Actions 菜单状态规则：
   - 建议：`Make public/private` 所有状态都允许，沿用现有 PATCH 行为。
   - 建议：`Reindex` 只在 `indexed` / `failed` 显示或启用。
   - 建议：`Delete` 所有状态都允许，沿用现有行为。
4. 空状态文案：
   - 建议：从 `No documents yet. Upload some files above.` 改为 `No documents yet. Upload a file to get started.`
5. 可访问性：
   - 建议写入验收标准：Tabs 使用正确 keyboard navigation / ARIA；Switch 有 `aria-label`，例如 `Use "${doc.name}" for retrieval`；More / Actions icon button 有可访问 label。
6. Tabs / Switch 来源：
   - 建议：优先用 shadcn CLI 添加 `tabs`、`switch`；如 CLI 输出不匹配当前 base-ui 风格，则按现有 `src/components/ui/*` 模式本地实现。
   - 倾向于不在文档里写死命令，只写“优先使用 shadcn 生成”。
7. Dialog 和状态边界：
   - 建议：`deleteTarget`、`rebuildDialogOpen`、`reindexingId`、`visibilityUpdatingId` 继续留在 `DocumentTable/useDocumentManagement`；`DocumentRow` 只通过 props 触发 action，不持有 dialog state。
8. Tab 数据加载策略：
   - 建议：lazy 加载。默认只加载 My documents；切到 Public documents 时再请求 public 数据。首屏轻量，第一次切换可能有短暂 loading。
9. Stacked row 实现方式：
   - 建议：方案 A，同一组件内并存两套 markup：`md:hidden` 的移动端 row + `hidden md:table-row` 的桌面 TableRow。
10. 搜索状态：
    - 建议：tab 内容保持挂载，切换回来时搜索状态保留；如果采用 lazy 加载，也不主动卸载已访问 tab。

确认这些后，再更新 REQUIREMENTS / DESIGN / PROGRESS 并进入实现。

---

## 3. 处理结果

> 日期：2026-05-11
> 状态：已处理，决策已写回 REQUIREMENTS / DESIGN / PROGRESS

1. UploadZone 紧凑化形态：已写入 `REQUIREMENTS.md` 3.6、`DESIGN.md` 7、`PROGRESS.md` 阶段 6。
2. Rebuild All 进度：已写入 `REQUIREMENTS.md` 3.2 和验收标准、`DESIGN.md` 5.1、`PROGRESS.md` 阶段 2。
3. Actions 菜单状态规则：已写入 `REQUIREMENTS.md` 3.3、`DESIGN.md` 5.2、`PROGRESS.md` 阶段 3。
4. 空状态文案：已写入 `REQUIREMENTS.md` 3.7 和验收标准、`PROGRESS.md` 验收清单。
5. 可访问性要求：已写入 `REQUIREMENTS.md` 3.8 和验收标准、`DESIGN.md` 4 / 6.3。
6. Tabs / Switch 来源：已写入 `DESIGN.md` 4、`PROGRESS.md` 文档一致性检查。
7. Dialog 和状态边界：已写入 `DESIGN.md` 4 和 4.1、`PROGRESS.md` 阶段 3。
8. Tab 数据加载策略：已写入 `DESIGN.md` 6.4、`PROGRESS.md` 文档一致性检查和阶段 4。
9. Stacked row 实现方式：已写入 `DESIGN.md` 5.4、`PROGRESS.md` 阶段 5。
10. 搜索状态保留：已写入 `DESIGN.md` 6.4、`PROGRESS.md` 阶段 4。
11. More / Actions 菜单组件来源：已写入 `DESIGN.md` 4。
12. 阶段划分不一致：已统一 `DESIGN.md` 8 和 `PROGRESS.md` 阶段清单为 6 个阶段。
