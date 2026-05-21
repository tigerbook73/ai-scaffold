# Voice Control — Progress

## 当前状态

**Phase: Phase 1 实现中**
**Last confirmed commit: —（尚未开始实现）**

---

## 已完成

- [x] 需求分析（REQUIREMENTS.md）
- [x] 架构策略分析与技术选型（DESIGN.md）
- [x] Ultraplan 审批通过，实现方案确认

---

## 实现阶段

### Phase 1：语音输入按钮（STT）

**新增文件：**

- `src/components/chat/useVoiceInput.ts` — Web Speech API hook

**改动文件：**

- `src/components/chat/useChatWindow.ts` — `send()` 增加 `textOverride?: string` 参数；`UseStreamingChatParams` 增加 `setProvider`
- `src/components/chat/ChatWindow.tsx` — 插入麦克风按钮，接入 `useVoiceInput`，传入 `setProvider`

### Phase 2：自然语言命令路由

**新增文件：**

- `src/lib/shared/schemas/command.ts` — 意图枚举 + 请求/响应 Zod schema
- `src/lib/server/command/classify.ts` — Claude tool_use 意图分类
- `src/lib/server/command/execute.ts` — 意图执行（调用已有数据函数）
- `src/app/api/command/route.ts` — `POST /api/command` 路由

**改动文件：**

- `src/lib/client/session-api.ts` — 新增 `callCommand()`
- `src/lib/server/route-policy.ts` — 注册 `/api/command` 为 `user-api`
- `src/components/chat/useChatWindow.ts` — `send()` 前置命令分发逻辑

---

## 下一步入口

从 Phase 1 开始：

1. 新建 `useVoiceInput.ts`
2. 改动 `useChatWindow.ts`（`send()` 签名）
3. 改动 `ChatWindow.tsx`（麦克风按钮）

---

## 已知风险

- Web Speech API 在 Firefox / Safari 不支持（按钮隐藏处理）
- 意图分类 LLM 调用增加约 200-500ms 延迟（仅命令路径，普通问答不受影响）
- 按 name 查找 document / session 依赖模糊匹配，重名时需特殊处理
