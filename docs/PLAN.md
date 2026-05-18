# AI Scaffold V2 实施计划

> 基于 [v2-design.md](./v2-design.md)。
> 所有交付物均为 Markdown 文件（Skill 提示词 + 模板文件），无需编写代码。

---

## 当前阶段

**▶ 阶段 5：Bootstrap ✅**

---

## 协作规则

1. **当前阶段**始终显示在本文件最前面
2. **命令驱动**，不主动提问
3. **默认节奏**：
   - `开始实施阶段 X` → 列出该阶段第一步的计划 + 上下文 → 讨论
   - `开始实施下一步` → 列出下一步计划 + 上下文 → 讨论
   - 只有说 **"OK / 同意方案"** + **"更新 / 写入"** 才真正写文件
4. **实施前是讨论**，不提前动笔
5. **提交注释**使用英文
6. **每次写入并提交后**，同步更新：
   - 顶部"当前阶段"（标注已完成的步骤）
   - 底部"进度"checklist

---

## 交付物一览

```
~/.claude/commands/
└── bootstrap.md                    # 系统级 Bootstrap Skill

项目根目录/
├── .ai-rules/
│   ├── context/architecture.md     # 单一来源（AI + 人工混合维护）
│   └── path-rules/feature-3doc.md  # Feature 三文档工作流（paths: docs/features/**）
└── .claude/commands/aisc/
    ├── refresh-arch.md
    ├── audit.md
    ├── plan-feature.md
    ├── close-work.md
    ├── setup-hooks.md
    └── setup-permissions.md
```

---

## 阶段划分

### 阶段 0：设计规范（完成）

Skill 格式约定：描述 + 约束 + 步骤（+ 可选输出格式节）。
模板粒度：最小骨架，内容 AI 生成。

---

### 阶段 1：architecture.md 模板（完成）

| 文件 | 状态 |
|------|------|
| `context/architecture.md` | ✅ 混合结构：AI 维护区 + 人工维护区，`---` 分界 |
| `path-rules/feature-3doc.md` | ✅ Feature 三文档工作流，paths: `docs/features/**` |
| CLAUDE.md 引用块 | ✅ `aisc:start/end` 标记，幂等追加 |

**决策记录**：
- `rules/` 多文件体系去掉——架构约束合并进 `architecture.md` 人工维护区
- `workflow.md` 不创建——Feature 工作流由 path-rule 承载

---

### 阶段 2：核心 Skill

| Skill | 核心行为 | 状态 |
|-------|---------|------|
| `refresh-arch` | 扫描代码 → 刷新 AI 维护区 → 展示 diff → 用户确认写入 | ✅ |
| `audit` | scope 输入驱动，检查代码变更是否偏离架构约束，输出规则溯源报告 | ✅ |

**待确认**：audit 的 `last_updated` 字段是否需要在每次运行后更新（当前设计为只读）。

---

### 阶段 3：Feature 生命周期 Skill

| Skill | 核心行为 |
|-------|---------|
| `plan-feature` | 创建 feature branch + 三文档 + 生成 feature-3doc path-rule（via sync-rules） |
| `close-work` | 提取结论到 architecture.md 人工维护区，清理三文档和 path-rule |

内部工具：`sync-rules`（由 plan-feature / close-work 调用，不直接暴露给用户）。

**待确认**：`close-work` 提取策略——哪些内容值得写入 architecture.md，哪些直接丢弃。

---

### 阶段 4：配置 Skill

| Skill | 核心行为 |
|-------|---------|
| `setup-hooks` | 检测 package.json，安装 husky + commitlint（+ lint-staged，可选） |
| `setup-permissions` | 生成或更新 `.claude/settings.json`，合并而非覆盖 |

---

### 阶段 5：Bootstrap

最后实现，依赖全部其他 Skill。

初始化流程：
1. 扫描项目（新 / 存量，检测冲突）
2. 运行 `refresh-arch` 逻辑生成 architecture.md（AI 维护区填充，人工维护区留空）
3. 追加 CLAUDE.md 引用块（已存在则跳过）
4. 调用 `setup-permissions`
5. 调用 `setup-hooks`（可选）
6. 安装所有 Skill 到 `.claude/commands/aisc/`

---

### 阶段 6：端到端验证

用一个真实 Node.js 项目走完完整流程：

1. Bootstrap 初始化
2. 开发一个 feature（`plan-feature` → 实施 → `close-work`）
3. 触发规则检查（`audit`）
4. 刷新上下文（`refresh-arch`）

---

## 当前开放决策

| 决策 | 影响阶段 | 说明 |
|------|---------|------|
| `close-work` 提取策略 | — | ✅ 已定：不提取，直接删除，architecture.md 更新走 refresh-arch |
| refactor 模式 | — | ✅ 已定：plan-feature --refactor，两文档（DESIGN + PROGRESS） |

---

## 进度

- [x] 阶段 0：设计规范
- [x] 阶段 1：architecture.md 模板
- [x] 阶段 2：核心 Skill（refresh-arch ✅ · audit ✅）
- [x] 阶段 3：Feature 生命周期 Skill（plan-feature ✅ · close-work ✅）
- [x] 阶段 4：配置 Skill（setup-hooks ✅ · setup-permissions ✅）
- [x] 阶段 5：Bootstrap ✅（选项 A：从 scaffold 仓库复制 skill 文件）
- [ ] 阶段 6：验证
