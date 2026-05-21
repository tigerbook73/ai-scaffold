# Voice Control — Design

## 可实现程度分析

### 现有 API 行动空间

| 领域       | 可语音触发的动作                | 可行性                 |
| ---------- | ------------------------------- | ---------------------- |
| 问答       | 语音提问                        | ✅ 高（仅需 STT 接入） |
| 会话管理   | 新建 / 删除 / 切换              | ✅ 高                  |
| 文档管理   | 列出 / 删除 / 可见性 / 重建索引 | ✅ 高                  |
| 公共文档   | 查看 / 添加 / 移除选择          | ✅ 高                  |
| 提供商切换 | Claude / DeepSeek / OpenAI      | ✅ 高                  |
| 管理员功能 | 用户列表 / 全局文档管理         | ⚠️ 本期不包含          |
| 文件上传   | 触发文件选择器                  | ⚠️ 本期不包含          |
| 账号管理   | 创建用户 / 重置密码             | ⚠️ 本期不包含          |

---

## 技术选型

### STT（语音转文字）

| 方案                               | 延迟            | 中文支持                           | 成本        | 评估                                   |
| ---------------------------------- | --------------- | ---------------------------------- | ----------- | -------------------------------------- |
| **Web Speech API**（Phase 1 采用） | 实时流式        | Chrome 较好，Firefox/Safari 不支持 | 免费        | 零成本快速验证，不改后端               |
| **OpenAI Whisper API**             | ~1-2s（批处理） | 优秀，中英混合                     | ~$0.006/min | 产品级升级路径，与现有 OpenAI 集成配合 |

### 意图识别（Phase 2 采用）

使用现有 `claude-sonnet-4-6` 做 tool_use 结构化输出，返回意图分类 JSON。复用 `getAnthropicClient()`，无需引入新模型。

### TTS

初期不包含，系统以文字回复为主。如有需要可后续扩展。

---

## 整体流程

```
用户输入（文字 / 语音）
        │
        ├─ 语音转写 OR 文字以 "/" 开头  ──►  POST /api/command
        │                                          │
        │                                   意图分类（Claude tool_use）
        │                                          │
        │              ┌────────────────────────────┤
        │         intent=question             intent=操作命令
        │              ▼                            ▼
        └─────►  POST /api/chat（SSE）       调用对应数据函数执行
                  现有路径，不变               结果以助手消息插入对话流
```

**触发规则**（避免对所有普通文字输入增加延迟）：

- 语音转写的文字 → 始终走命令路由
- 以 `/` 开头的文字 → 走命令路由
- 其他普通文字 → 原有 `/api/chat` 路径，完全不变

---

## 架构策略

### Phase 1：语音输入（Level 1）

新增 `useVoiceInput` hook 封装 `window.SpeechRecognition`（含 `webkitSpeechRecognition` 降级）。在 `ChatWindow` 编辑器行插入麦克风按钮，转写完成后调用 `send(text)` 自动发送。

- 仅前端改动，无后端新增
- `isSupported` 为 `false` 时按钮自动隐藏（Firefox / Safari）
- `send()` 增加 `textOverride?: string` 参数，供语音路径直接传入转写文字

### Phase 2：命令路由（Level 2）

新增 `POST /api/command`，使用 Claude tool_use 将输入分类为具体意图，再调用对应数据函数执行，最后将结果以助手消息形式返回。

支持的意图命令集：`list_sessions`、`delete_session`、`new_session`、`list_documents`、`delete_document`、`reindex_document`、`switch_provider`、`navigate`。

`switch_provider` 和 `navigate` 两类意图不涉及数据库操作，服务端返回特殊标记（如 `__SWITCH_PROVIDER:claude__`），由前端解析后分别调用 `setProvider()` 或 `router.push()`。

按名称查找 document / session 时在当前用户范围内模糊匹配，找不到时返回友好错误消息。

### Phase 3：Agentic 多轮控制（可选，进阶）

LLM Agent 以全部 API 为工具，支持链式调用和多轮确认。工程复杂度高，建议等 Phase 2 验证需求后再考虑。

---

## 关键架构决策

| 决策点       | 选择                                          | 理由                         |
| ------------ | --------------------------------------------- | ---------------------------- |
| 意图识别位置 | 服务端（`POST /api/command`）                 | 逻辑集中，API key 不暴露前端 |
| 命令结果呈现 | 对话气泡（非 Toast / 弹窗）                   | 体验连续，与问答结果融合     |
| STT          | Web Speech API（Phase 1），Whisper 为升级路径 | 零成本快速验证               |
| TTS          | 初期跳过                                      | 降低复杂度                   |
| 管理员命令   | 本期不包含                                    | 降低范围，先验证核心价值     |

---

## 与现有架构的兼容性

- 现有 `/api/chat` 路由完全不变
- `send()` 仅在触发条件满足时走新路径，普通文字路径不受影响
- 复用 `withUser` HOF、`validationErrorResponse`、`getAnthropicClient()` 等已有工具
- 不引入新 UI 库或外部 SDK
