# multi-user-e2e 实施进度

## 当前状态

- 当前阶段：未开始
- 状态：已规划
- 最后确认的实现提交：无
- 最后确认的设计提交：无
- 进度文档状态：需求和设计已完成，待启动实施
- 下一步入口：阶段 1 — globalSetup 和 auth fixtures（见 DESIGN.md 第 8 节）

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`

## 阶段清单

- [ ] 阶段 1：globalSetup 和 auth fixtures
- [ ] 阶段 2：会话隔离和文档隔离测试
- [ ] 阶段 3：公开文档选择测试（含检索）
- [ ] 阶段 4：Admin 操作测试

## 已实施内容

无。

## 已知不一致

无。

## 验证状态

- 现有 `e2e/basic.test.ts`（2 个测试）：通过。
- 本 feature 新增测试：未创建。

## 下一步

启动阶段 1：

1. 新增 `e2e/global-setup.ts`，为三个账号生成 storageState。
2. 新增 `e2e/fixtures/auth.ts`，暴露 `adminPage`、`user1Page`、`user2Page`。
3. 更新 `playwright.config.ts` 引用 globalSetup。

## 恢复协议

恢复此 feature 时：

1. 从最新提交读取本文件。
2. 检查 `git status`。
3. 检查最后确认实现提交之后的新提交。
4. 检查 `DESIGN.md` 或 `REQUIREMENTS.md` 是否在最后确认进度之后发生变化。
5. 只检查当前阶段所必需的代码路径。
6. 每次阶段或子阶段提交前更新本文件。
