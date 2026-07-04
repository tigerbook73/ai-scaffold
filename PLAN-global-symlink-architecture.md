# 全局 Symlink Skill 架构调整计划

## Summary

将默认安装模型改为“全局可用，项目内仅保存本地定制/状态”。`ai-skills sync-global` 负责把所有启用的 skill 以 symlink 形式安装到 `~/.claude/skills`。项目级 `/setup add/update/remove` 不再复制普通 skill、script、resource；只有声明为需要本地定制或必须本地复制的组件才写入项目 `.aisk` / `.claude`。

任何包含 `rules` 的 unit 暂时整体屏蔽，不参与全局同步、不参与 `add all`，显式安装时报错提示 disabled。

## Key Changes

- 新增 CLI 命令：`ai-skills sync-global`
  - 确保 `~/.claude/skills/aisk-setup -> <repo>/global/setup`
  - 为每个启用 unit 的 skill 创建全局目录：`~/.claude/skills/aisk-{unit}-{skill}/`
  - 目录内使用 symlink：`SKILL.md -> units/{unit}/skills/{skill}.md`，并按需 symlink `resources/`、`scripts/`
  - 清理本工具曾创建但当前已不存在/已禁用的全局 skill symlink

- 暂时屏蔽 rule units
  - 只要 `unit.json.components.rules` 非空，该 unit 视为 disabled
  - 当前会屏蔽：`playwright`、`test-review-gate`、`ui-coverage`、`ui-testability`
  - `list` 默认不展示 disabled units；`show/add/update` 显式指定时返回 disabled reason

- 项目本地安装语义调整
  - `add/update` 不再复制普通 skill、script、resource
  - `scripts` 默认使用全局 symlink 版本；hook 命令后续指向全局脚本路径，不生成 `.aisk/{unit}/scripts/*.js`
  - `.aisk/installed.json` 只记录项目本地内容：custom/must-copy 组件、hook 注册、项目状态
  - 为未来扩展增加组件字段 `localCopy?: true`；只有 `hasCustom` 或 `localCopy` 的非 rule 组件会复制到项目

- 更新依赖文档和 skill 内路径
  - `staged-plan`、`walkthrough` 等不再引用 `.aisk/{unit}/resources/...` 静态资源路径
  - 改为引用全局 skill 目录下的 `resources/` / `scripts/`
  - walkthrough 的项目运行状态仍保存在项目 `.aisk/walkthrough/state/`

## Implementation Notes

- Installer 增加 enabled-unit 过滤函数：无 rules 才 enabled。
- `resolveDeps`、`list`、`add all`、`sync-global` 都使用 enabled units。
- `remove` 只移除项目本地安装记录和本地生成内容，不删除全局 skill；全局 skill 由 `sync-global` 管理。
- `refresh` 只扫描本地 custom/must-copy 文件，不扫描全局 symlink skill。
- `show` 输出需要区分：
  - global skill: available
  - local component: installed / todo / done
  - disabled unit: disabled because rules are temporarily unsupported

## Test Plan

- `sync-global`：
  - 创建 setup symlink 和普通 skill 全局目录
  - symlink 指向 repo 源文件，重复运行幂等
  - 已删除/禁用 unit 的旧 managed symlink 会被清理
  - rule units 不会被同步

- Installer：
  - `add` 普通 skill-only unit 不复制 `.claude/skills` 或 `.aisk/resources`
  - `add all` 跳过 rule units
  - 显式 `add test-review-gate` 返回 disabled failure
  - `refresh/remove/update` 对无本地组件的 global-only unit 不误删全局 symlink
  - `show/list` 展示新状态语义

- 验证：
  - `pnpm verify`
  - 手动 dry check：运行 `ai-skills sync-global` 后确认 `~/.claude/skills/aisk-*` symlink 结构正确

## Assumptions

- “有 rules 的暂时屏蔽掉”按整 unit 屏蔽处理。
- 当前没有需要本地复制的非 rule 组件；后续通过 `localCopy: true` 显式声明。
- 全局 symlink 目录由 `ai-skills sync-global` 管理，不由项目级 `/setup add/remove` 管理。
