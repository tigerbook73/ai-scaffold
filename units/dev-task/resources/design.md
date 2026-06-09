# 设计步骤格式：必要章节

本文档定义设计文档中每个步骤的必要章节。
设计文档可以拆分为多个文件（列于 `dev-task-state.md` Document Index 中）；
无论步骤位于哪个文件，格式约束均适用。
所有其他步骤内容（目标、架构说明、关键变更、设计理由）为自由格式。

---

## Step Type

**Step Type**：`intermediate` | `final`

- `intermediate` —— 此步骤产出的代码是过渡性的；后续步骤将完成或替换它。
  不强制要求完整测试；在步骤中注明哪个后续步骤会最终完成该代码。
- `final` —— 此步骤产出的代码达到生产质量。测试必须在此步骤中编写，
  或明确委托给某个后续步骤并在此处注明。

---

## Auto Verification

自动运行的命令，用于验证步骤的输出。

- `(auto)` `<command>` —— 直接执行；必须退出码为 0
- `(superseded)` 替换任何已不再有效的条件

**`final` 步骤的指导原则**：至少包含一个能执行新行为的功能测试命令
（如针对性测试过滤器或新测试文件）—— 而不仅仅是运行全部现有测试套件。
保持命令低代价、快速；高代价检查应放入 Manual Verification。

**`intermediate` 步骤的指导原则**：auto 条件为可选；仅包含对过渡状态有意义的条件。

---

## Manual Verification

无法以合理代价自动化的检查项，需人工确认。

- `(manual)` <描述>
- `(manual) [automation-candidate]` <描述> —— 标记未来值得自动化的项目

当某个项目目前自动化成本过高但未来可以合理实现时，使用 `[automation-candidate]`。

---

## Dev-Task Acceptance

验证整个dev-task是否满足需求验收标准的条件。
此章节出现一次，位于设计文档末尾（若文档已拆分则在最后一个设计文件中）。
由 `verify dev-task` 上下文命令验证，而非 `verify step`。

`requirements.md` 中的每条验收标准必须在此处至少对应一个条件。

- `(auto)` `<command>` —— 直接执行；必须退出码为 0
- `(manual)` <描述>
- `(superseded)` 替换任何已不再有效的条件
