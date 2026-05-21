# knowledge-upload 设计

## 1. 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

---

## 2. 现状分析

### 2.1 上传流程

- `POST /api/documents`：接收文件，写入磁盘/storage，创建 `Document` 记录（status: `pending`），立即返回 `{ id, ... }`。索引在 worker thread 异步执行。
- 返回的字段包含文档完整信息（id、name、status、total_chunks 等）。

### 2.2 当前轮询机制

- Knowledge 页面（或其 client 组件）用 `POLL_INTERVAL_MS`（`src/lib/config.ts`）定时调用 `GET /api/documents`，刷新整个列表。
- 上传后到文档首次出现在列表，需等待最长一个完整轮询周期。

### 2.3 API 可用字段

`GET /api/documents` 每条记录包含：`id`、`name`、`mime`、`status`（`pending`|`indexing`|`indexed`|`failed`）、`total_chunks`、`error_msg`、`createdAt`。

注：`status` 字段包含 `indexing` 需验证——若 worker 不写入中间态，则只有 `pending` / `indexed` / `failed`。实施前检查 `src/lib/ingest/pipeline.ts`。

---

## 3. 设计方案

### 3.1 上传后立即插入（Optimistic Insert）

上传成功后，将 `POST /api/documents` 返回的文档数据**立即插入**本地 documents state（prepend 到列表头部），无需等待轮询。

```ts
// 上传成功后
const newDoc = await res.json();
setDocuments((prev) => [newDoc, ...prev]);
startPollingFor(newDoc.id);
```

优点：零延迟显示，用户上传即可看到反馈。

### 3.2 活跃文档轮询（Per-document Active Polling）

对于 state 中 status 为 `pending` 或 `indexing` 的文档，启动专项轮询：

1. 上传后调用 `GET /api/documents/[id]` 每隔 `POLL_INTERVAL_MS` 获取最新状态。
2. 收到响应后更新 state 中对应文档行（id 匹配替换）。
3. 当 status 变为 `indexed` 或 `failed` 时，停止该文档的轮询。

如果已有全局列表轮询（`GET /api/documents`），可以复用它：检查返回数据中是否有 `pending`/`indexing` 文档，如有则保持轮询活跃；所有文档都稳定后停止。

### 3.3 轮询触发逻辑

```
upload success
  └─ optimistic insert (pending)
  └─ hasActiveDoc = true → start polling
       │
       ├─ GET /api/documents (full list refresh)
       ├─ update state
       └─ if any doc.status in ['pending','indexing'] → schedule next poll
          else → stop polling
```

这样只需维护一个"是否有活跃文档"的 boolean flag，不需要 per-document interval。

---

## 4. 组件改造范围

| 文件                                          | 变更                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/app/knowledge/page.tsx` 或其 client 组件 | 上传后 optimistic insert；管理 `hasActiveDoc` state 和轮询逻辑                     |
| `src/lib/config.ts`                           | 确认 `POLL_INTERVAL_MS` 值，必要时新增 `ACTIVE_POLL_INTERVAL_MS`（可与现有值相同） |

实施前需读取 knowledge 页面的完整实现（确认 client/server 拆分方式、现有轮询代码位置）。

---

## 5. 边界情况

- **页面刷新/重新挂载**：组件挂载时检查 state 中是否有 `pending`/`indexing` 文档，如有则自动启动轮询。服务端 SSR 已返回初始文档列表，无需额外处理。
- **上传失败**：`POST /api/documents` 失败时不做 optimistic insert，仅 toast 错误提示。
- **多文件上传**：每次上传触发一次 optimistic insert，轮询逻辑统一处理所有活跃文档。
- **轮询并发**：确保同一时间只有一个 polling interval 在运行（清除旧 interval 再创建新的）。

---

## 6. 测试策略

- 单元测试：轮询启停逻辑（mock fetch，验证 interval 在 `indexed` 后清除）。
- 人工验证：上传文件后观察列表即时出现，状态从 `pending` → `indexed` 实时更新。
