# knowledge-upload 实施进度

## 当前状态

- 当前阶段：未开始
- 状态：需求与设计文档已就绪，待实施
- 最后确认的实现提交：无
- 下一步入口：读取 `src/app/knowledge/page.tsx` 及其 client 组件，确认现有轮询代码结构，再按设计方案实施

## 文档结构

- `REQUIREMENTS.md`（未提交）
- `DESIGN.md`（未提交）
- `PROGRESS.md`（未提交，即本文件）

## 文档一致性检查

- 需求与设计文档同日创建（2026-05-07），尚无实现提交，无一致性冲突。
- 实施前需验证 `status` 字段是否包含 `indexing` 中间态（见 DESIGN.md Section 2.3 注）。

## 阶段清单

- [ ] 阶段 1：Knowledge 页面分析与轮询改造

## 阶段 1 计划：Knowledge 页面分析与轮询改造

1. 读取 `src/app/knowledge/page.tsx` 及其相关 client 组件，确认：
   - 文档列表的 state 管理位置（useState / server component SSR）
   - 现有轮询代码（`POLL_INTERVAL_MS` 如何使用）
   - 上传成功后的当前处理方式
2. 检查 `src/lib/ingest/pipeline.ts`，确认 `status` 字段是否有 `indexing` 中间态。
3. 按 DESIGN.md Section 3 实施：
   - 上传后 optimistic insert
   - `hasActiveDoc` flag 驱动的轮询启停
4. `pnpm exec tsc --noEmit`
5. 人工验证上传流程

## 验证状态

- `pnpm exec tsc --noEmit`：待执行。
- `pnpm exec jest`：待执行。
- 人工验证：待执行。

## 验收清单

- [ ] 上传文件后，文档立即出现在列表中（status: `pending`）
- [ ] 索引过程中，列表行实时更新 chunk 数量和状态
- [ ] 索引完成后，显示 `indexed` 状态，轮询停止
- [ ] 索引失败时，显示 `failed` 状态
- [ ] 非活跃文档不触发额外轮询

## 恢复协议

恢复此 feature 时：

1. 先读取本文件（PROGRESS.md）。
2. 再读取 [DESIGN.md](./DESIGN.md)。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status` 和 `git log`，确认是否有相关实现提交。
5. 如果有实现提交，以实际代码为准，更新本文件的已完成工作。
