# Dev-Task State: project-structure

## Metadata

- type: refactor
- status: in_progress

## Document Index

- `requirements-arch.md` — 架构需求（Phase 1，已完成）：ai-unit 模型、三层结构、register/setup/clean、验收标准
- `requirements.md` — 迁移需求（当前）：skill 迁移、gate 规则、老架构清理、命名约定统一
- `design.md` — 迁移设计（当前）：4 步骤骨架，各步目标与验证方式

## Current Phase

implementation (in_progress)

## Current Step

test-review-gate 已实现；构建已忽略脚本目录中的测试文件；待提交

## Requirements Phase（架构）

- status: done
- notes:
  - requirements-arch.md 已完成，覆盖 ai-unit 模型、目录结构、安装机制、全局命令边界、验收标准
  - Phase 1 PoC 实现完成（4 步骤全部 done）

## Requirements Phase（迁移）

- status: done
- notes:
  - requirements.md 已完成，4 步骤：skill 迁移、gate 规则建立、老架构清理、重命名统一

## Design Phase（迁移）

- status: done
- notes:
  - design.md Step 1 TBD 已细化（unit 结构、verification 命令）
  - Steps 2–4 细化推迟至各步实施前

## Implementation Phase（迁移）

### Step 1：迁移 skill 到 ai-unit 架构

- step-type: final
- status: done
- Commit: 9a37e81
- Date: 2026-06-08
- auto-check: pass
- manual-check: pending（需在测试项目验证三个 skill 可调用）

### Step 2：建立 gate 规则

- step-type: final
- status: done
- Commit: 69be858
- Date: 2026-06-08
- auto-check: pass
- manual-check: pending（编辑 ai-units/poc-unit/skills/poc.md，确认 skill-gate 规则生效）

### Step 3：清理老架构产物

- step-type: intermediate
- status: done
- Commit: 8806a95
- Date: 2026-06-08
- auto-check: pass
- manual-check: n/a

### Step 4：重命名约定统一

- step-type: final
- status: done
- Commit: 6f900d7
- Date: 2026-06-08
- auto-check: pass
- manual-check: pending（端到端：pnpm register → 测试项目 aisk:setup → 安装 unit → 验证可用）

## Implementation Phase（Phase 1 PoC）

- status: done

### Step 1: 目录结构 + PoC 单元定义

- step-type: intermediate
- status: done
- Commit: 46a4ccb
- Date: 2026-06-06
- auto-check: pass
- manual-check: pass

### Step 2: publish 命令

- step-type: final
- status: done
- Commit: b740aa5
- Date: 2026-06-06
- auto-check: pass
- manual-check: pass

### Step 3: setup 命令（add only）

- step-type: final
- status: done
- Commit: 98fb2dc
- Date: 2026-06-06
- auto-check: pass
- manual-check: pending（需测试项目手动验证）

### Step 4: clean 命令

- step-type: final
- status: done
- Commit: 3ffd1b8
- Date: 2026-06-06
- auto-check: pass
- manual-check: pending（需人工确认 setup skill 不可用、目标项目内容不受影响）

## Implementation Phase（附加：test-review-gate）

### Step 5：将 setup-test-review-gate 转换为 ai-unit

- step-type: final
- status: done
- notes:
  - `units/test-review-gate/rules/test-review-gate.md` — 从 archive 复制，Claude 规则
  - `units/test-review-gate/scripts/check-reviewed-by-commit-marker.ts` — pre-commit hook，检查已声明的人工审查 marker
  - `units/test-review-gate/scripts/check-test-cases-match-it.ts` — pre-commit hook，检查已声明审查字段的测试文件中 `@cases` / `it()` / `test()` 一致性
  - `units/test-review-gate/scripts/check-reviewed-by-commit-marker.test.ts` — 保留在 unit 脚本目录中作为源码测试
  - `scripts/build.ts` — scripts 组件扫描忽略 `*.test.ts` / `*.spec.ts`
  - `tests/build.test.ts` — 覆盖测试/规格文件不会注册为 scripts 组件
  - `units/test-review-gate/unit.json` — 已创建并移除测试脚本组件
  - `pnpm build` — 已注册至 units.json
  - auto-check: `pnpm exec vitest run tests/build.test.ts` pass；`pnpm typecheck` pass；`pnpm build` pass

## Dev-Task Acceptance

- auto-check: —
- manual-check: —
