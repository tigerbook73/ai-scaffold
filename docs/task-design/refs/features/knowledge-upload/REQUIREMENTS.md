# knowledge-upload 需求

> 状态：**草稿，待确认**
> feature-id: knowledge-upload

---

## 1. 目标

改善 Knowledge 页面的文档上传体验：上传后立即在列表中显示文档及其状态，并在索引过程中实时反馈进度（chunk 数量、当前状态），直到索引完成或失败。

---

## 2. 当前行为

1. 用户在 `/knowledge` 上传文件 → `POST /api/documents` 返回文档 ID。
2. 索引在后台 worker thread 中异步进行。
3. Knowledge 页面通过固定间隔轮询（`POLL_INTERVAL_MS`）`GET /api/documents` 刷新列表。
4. **问题**：上传后到文档出现在列表之间存在明显延迟；索引期间的 chunk 数量和状态变化没有及时反映。

---

## 3. 期望行为

### 3.1 上传后立即显示

- 上传成功后，文档**立即**出现在列表中，显示 `pending` 状态。
- 不需要等待下一个轮询周期。

### 3.2 索引开始后立即刷新

- 索引开始后（文档状态从 `pending` 变为 `indexing` 或 `total_chunks` 更新），立即刷新该文档行，显示当前 chunk 数量和状态。

### 3.3 周期轮询直到完成

- 对于状态为 `pending` 或 `indexing` 的文档，持续周期轮询，直到状态变为 `indexed` 或 `failed`。
- 轮询频率复用现有 `POLL_INTERVAL_MS` 配置。

### 3.4 错误状态

- 索引失败时，列表中该文档行显示 `failed` 状态，并展示错误信息（如有）。

---

## 4. 不在范围内

- 上传进度条（文件传输阶段的 byte-level 进度）。
- WebSocket / SSE 实时推送（轮询方案已足够）。
- 多文件批量上传状态聚合。

---

## 5. 验收标准

- [ ] 上传文件后，文档**立即**出现在列表中（状态 `pending`），无需等待轮询周期。
- [ ] 索引过程中，列表行实时更新 chunk 数量和状态（`pending` → `indexing` → `indexed`）。
- [ ] 索引完成后，列表显示 `indexed` 状态，轮询停止。
- [ ] 索引失败时，列表显示 `failed` 状态。
- [ ] 非活跃文档（`indexed` / `failed`）不触发额外轮询。
