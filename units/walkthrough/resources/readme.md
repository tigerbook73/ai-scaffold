# walkthrough Skill 组

结构化代码走读：一次性分析所有变更，对变更进行分组，展示全局概览，然后按需逐组走读。

## Skills

**`create-walkthrough`** — 创建新的走读。确认目标范围，必要时签出目标版本，一次性读取所有 diff 和上下文文档，对变更分组，展示全局概览，然后进入交互式循环。组内容在导航过程中按需生成。

**`start-walkthrough`** — 从状态文件恢复走读。每次新 session 开始时重新运行以恢复进度。

## 输入格式

```
/aisk/create-walkthrough              # 所有未提交变更；若工作树干净则为最新 commit
/aisk/create-walkthrough C1           # commit C1 引入的变更（相对于 C1~1）
/aisk/create-walkthrough C1..         # 从 C1 到当前工作树
/aisk/create-walkthrough C1..C5       # 从 C1 到 C5（累计）
```

## 导航命令（走读过程中）

```
wtgroup next      # 前进到下一组
wtgroup prev      # 返回上一组
wtgroup G3        # 跳转到第 3 组
wtgroup list      # 列出所有组及完成状态
wtgroup overview  # 重新显示全局概览
wtgroup finish    # 结束走读
```

## 状态文件布局

```
{cwd}/.aisk/walkthrough/state/{stateKey}/
  index.json   ← 进度元数据（由 walkthrough-state.ts 管理）
  g1.md        ← 第 1 组的走读内容（首次访问时生成）
  g2.md        ← 第 2 组的走读内容（首次访问时生成）
  ...
```

`{stateKey}` = 当前分支名，其中 `/` 替换为 `-`。

## 资源文件

- `resources/strategy.md` — 分析、分组和展示策略（可独立调整，无需修改 skill 流程文件）
- `resources/walkthrough-loop.md` — `create-walkthrough` 和 `start-walkthrough` 共用的交互式循环
- `scripts/walkthrough-state.ts` — 管理 `index.json` 的 CLI 脚本
- `scripts/types.ts` — 状态 index 的 TypeScript 类型定义
