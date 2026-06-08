# start-task

为当前 session 恢复任务上下文。

**步骤**

1. 检查代码库根目录下 `docs/tasks/*/` 中是否存在 `task-state.md`。
   若未找到，提示用户先运行 create-task，然后停止。
   若找到多个，询问用户要恢复哪个任务。
2. 读取 `task-state.md` 以及其 Document Index 中列出的所有文档（需求和设计文件）。
3. 输出任务摘要：当前阶段、关键进展和待办事项。
