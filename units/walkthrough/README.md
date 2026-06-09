# walkthrough

## 干什么的

`walkthrough` 用于创建或恢复结构化代码走读。它会选择目标变更范围，分析 diff，将变更按学习或审查意图分组，并保存可恢复的走读状态。

该单元适合理解一组代码变更的设计思路，或按风险区域审查一次变更。

## 怎么用

1. 确保工作树状态符合目标场景：
   - 有未提交变更时，可走读当前工作树。
   - 工作树干净时，可走读最新 commit 或从指定 commit 到当前版本的范围。
2. 请求 agent 创建走读，例如：`create-walkthrough` 或 `create-walkthrough HEAD~3..HEAD`。
3. agent 会引导选择走读目标、走读意图和可选参考资料。
4. agent 会生成全局分组概览，并等待确认或调整。
5. 确认分组后，agent 会按组进入走读循环。
6. 后续新 session 中重新运行该 skill，可恢复当前分支对应的活跃走读状态。

## 组件

- Skill：`skills/create-walkthrough.md`
- Script：`scripts/walkthrough-state.ts`
- Resources：
  - `resources/strategy.md`
  - `resources/walkthrough-loop.md`
  - `resources/readme.md`

## 注意事项

- 每个 state key 只允许一个活跃走读。
- 走读状态保存在 `.aisk/walkthrough/state/{stateKey}/`。
- 签出目标版本前要求工作树干净。
- 体量较大的 diff 会先提示缩小范围或确认继续。
