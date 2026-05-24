# Codex Adapter Blueprint

## Goal

Make this repository usable from both Claude Code and Codex while keeping the current Claude workflow stable.

The repository already contains reusable workflow content in `skills/**/SK-*.md`, but the current distribution target is Claude Code slash commands under `~/.claude/commands/aisk/`. Codex uses a different skill shape: each skill is a directory under `~/.codex/skills/` with a required `SKILL.md` file, YAML frontmatter, and trigger-oriented metadata.

The long-term goal is not just "generate Codex files". The goal is to make this repository maintainable as a multi-agent skill library with one clear source of truth and separate target adapters.

## Design Principles

- Preserve existing Claude behavior unless a change is explicitly part of a migration step.
- Keep skill workflow content canonical and agent-neutral where practical.
- Keep agent-specific behavior in target adapters, generated output, or clearly named target-specific resources.
- Avoid hardcoded one-off exclusions when target metadata would make the rule explicit.
- Keep generated files clearly generated; do not make users hand-edit generated manifests.
- Prefer small deterministic scripts over model-dependent transformations for install/build behavior.

## Current State

- `CLAUDE.md` documents repository maintenance rules for Claude Code.
- `scripts/build.ts` scans `skills/**/SK-*.md` and generates `claude/setting.json`.
- `scripts/setup.ts` installs command markdown files into `~/.claude/commands/aisk/`.
- `skills/**/SK-*.md` are written as Claude slash-command procedures, usually with `**Usage**: /aisk/...`.
- `skills/**/resource/` contains runtime templates and scripts that are read by some skills.
- `.claude/rules/skill-rules.md` is currently the source for generated skill format documentation.
- Some skills are agent-neutral in purpose, but many contain Claude-specific invocation, path, or task-context assumptions.

## Feasibility

### High Feasibility

The repository can support Codex through an additive adapter layer.

Reasons:

- Skill source files are plain Markdown and already organized by command.
- Each skill has a title, description, constraints, input, and steps, which map well to a Codex `SKILL.md` body.
- The build/install scripts are small TypeScript programs, so adding a second target is straightforward.
- Runtime resources already live alongside skill sources and can be copied or referenced from generated Codex skills.
- Existing Claude output can remain unchanged if Codex generation writes to separate paths.

### Not a Direct Drop-in

Codex cannot directly consume this repository by reading `CLAUDE.md` alone.

Main differences:

- Claude commands are invoked explicitly as `/aisk/command-name`.
- Codex skills are selected by `name` and `description` metadata, then load `SKILL.md`.
- Claude uses `~/.claude/commands/aisk/*.md`; Codex uses `~/.codex/skills/<skill>/SKILL.md`.
- Claude permission files such as `.claude/settings.local.json` are not meaningful for Codex.
- Some instructions mention Claude-specific auto-loading behavior, for example task-local `.claude/CLAUDE.md`.

## Recommended Architecture

Keep one canonical skill source tree and generate per-agent targets.

```text
skills/
  task/SK-create-task.md              canonical workflow source for now
  task/resource/                      shared and target-specific templates
  task/resource/resource-claude.md    Claude task context template
  task/resource/resource-codex.md     Codex task context template, if needed

claude/
  setting.json                        generated Claude install manifest

codex/
  setting.json                        generated Codex install manifest
  generated/                          optional generated preview output

scripts/
  build.ts                            current Claude builder, eventually a wrapper
  build-claude.ts                     Claude target builder
  build-codex.ts                      Codex target builder
  setup-claude.ts                     Claude installer
  setup-codex.ts                      Codex installer
```

Longer term, the build entrypoint can become a target-aware wrapper:

```bash
pnpm build:claude
pnpm build:codex
pnpm build:all
pnpm register:claude
pnpm register:codex
pnpm register:all
```

`pnpm register` can remain Claude-only during the transition to avoid surprising existing users.

## Structural Refactors Required

### 1. Split Agent-neutral Source From Agent-specific Targets

Current source files are named and written as Claude slash commands. That can work as a short-term source format, but the repository should explicitly distinguish:

- source skill content
- Claude target manifest/output
- Codex target manifest/output
- shared resources
- target-specific resources

Without this distinction, Codex support will become a chain of Claude-specific string replacements.

### 2. Rename or Isolate Claude-specific Setup

`scripts/setup.ts` is currently a Claude installer because it writes to `~/.claude/commands/aisk/`.

Recommended change:

- Rename or copy it to `scripts/setup-claude.ts`.
- Keep `scripts/setup.ts` as a compatibility wrapper during transition.
- Add `scripts/setup-codex.ts` for Codex.

This makes installer responsibilities obvious and reduces future ambiguity around `register`.

### 3. Fix `create-skill` Naming Inconsistency

Current convention in the repository is `skills/{category}/SK-{command}.md`.

Earlier `create-skill` behavior wrote to:

```text
skills/{name}/{name}.md
```

That conflicted with the current scanner and documentation convention. Normalize this before adding Codex support so both targets inherit one naming rule.

Recommended target:

```text
skills/{category-or-name}/SK-{command}.md
```

If categories are not known, default to:

```text
skills/{command}/SK-{command}.md
```

### 4. Move Skill Format Rules Out of `.claude/`

`scripts/build.ts` currently extracts format documentation from `.claude/rules/skill-rules.md`.

That makes the canonical skill format Claude-owned. For multi-agent maintenance, move canonical source-format documentation to an agent-neutral location, for example:

```text
docs/skill-source-format.md
```

Then target-specific rules can reference it:

- `.claude/rules/skill-rules.md`
- `AGENTS.md`
- generated Codex skill guidance

### 5. Add Target Metadata

Some skills should not be installed into every target. For example, `set-claude-permission` is Claude-only.

Avoid baking all exclusions into builder code. Add metadata that can express the following conceptual shape:

```yaml
targets:
  claude: true
  codex: false
codex:
  name: aisk-create-task
  description: Use when ...
  shortDescription: Create a structured task
```

This metadata can start as sidecar files if changing every skill source is too disruptive:

```text
skills/task/SK-create-task.meta.json
```

or a central registry:

```text
skills/manifest.json
```

Sidecars keep metadata close to the source. A central registry makes it easier to audit target coverage.

### 6. Separate Shared Task Context From Claude Task Context

`skills/task/resource/resource-claude.md` is explicitly Claude-oriented. Codex will not automatically load `docs/tasks/{name}/.claude/CLAUDE.md`.

Recommended split:

- Shared task workflow rules live in a neutral resource.
- Claude-specific task context imports or mirrors the shared rules.
- Codex task context is generated as `AGENTS.md` or handled by explicit skill steps.

Potential structure:

```text
skills/task/resource/task-context.md
skills/task/resource/resource-claude.md
skills/task/resource/resource-codex.md
```

### 7. Reconcile Stale Documentation and Missing Commands

Older docs and skill text mentioned `/aisk/sync`, but no current `sync` skill exists in `skills/`.

Before expanding to Codex, either:

- reintroduce a sync command,
- replace `/aisk/sync` wording with `pnpm register`, or
- document why sync is obsolete.

Also reconcile documentation that says `claude/setting.json` descriptions are preserved with the actual builder behavior. The current builder regenerates descriptions from source.

### 8. Add Root Codex Guidance

Add `AGENTS.md` at the repository root so Codex has first-class project instructions.

This should mirror the maintenance rules in `CLAUDE.md` without implying Claude-specific command behavior.

## Codex Skill Mapping

For each valid source file:

```text
skills/task/SK-create-task.md
```

Generate:

```text
~/.codex/skills/aisk-create-task/SKILL.md
```

Suggested generated frontmatter:

```yaml
---
name: aisk-create-task
description: Use when the user wants to initialize a structured development task with branch setup, task documents, requirements, design, and acceptance tracking.
metadata:
  short-description: Create a structured task
---
```

Body transformation:

- Keep the original procedural content when it is agent-neutral.
- Remove or rewrite `**Usage**: /aisk/...` lines.
- Replace `$ARGUMENTS` wording with natural language input handling.
- Rewrite references to "Claude" only when the behavior is truly Codex-compatible.
- Leave file paths and commands intact when they refer to shared project files.
- Add concise Codex notes only when Codex behavior differs from Claude behavior.

## Skill Classification

### Agent-neutral and Good First Candidates

- `arch/SK-refresh-arch.md`
- `arch/SK-check-arch.md`
- `smart-review/SK-smart-review.md`
- `setup-precommit/SK-setup-precommit.md`

These are mostly procedural workflows over project files and shell commands.

### Feasible With Targeted Rewrites

- `task/SK-create-task.md`
- `task/SK-start-task.md`
- `task/SK-resume-task.md`
- `task/SK-verify-step.md`
- `task/SK-verify-task.md`
- `task/SK-complete-task.md`
- `walkthrough/SK-create-walkthrough.md`
- `walkthrough/SK-start-walkthrough.md`
- `walkthrough/SK-resume-walkthrough.md`

These use reusable project-state documents and can work in Codex, but the task-mode auto-loading story must be changed.

### Claude-specific or Should Be Split

- `init-project/SK-init-project.md`
- `set-claude-permission/SK-set-claude-permission.md`
- `create-skill/SK-create-skill.md`

These currently manage Claude settings, Claude commands, or Claude distribution language. They need either Codex variants or explicit exclusion from the Codex target.

## Main Obstacles

### 1. Trigger Semantics

Claude users explicitly call `/aisk/create-task`. Codex users usually ask in natural language, and Codex decides whether a skill applies based on the frontmatter `description`.

Risk:

- Poor descriptions will cause skills to trigger too often or not at all.

Mitigation:

- Generate conservative descriptions from source content, then hand-tune descriptions for important skills through target metadata.
- Prefix generated skill names with `aisk-` to avoid collisions with built-in or third-party Codex skills.

### 2. Task Mode Auto-loading

The current task workflow creates `docs/tasks/{name}/.claude/CLAUDE.md`, relying on Claude Code's directory-aware instructions.

Risk:

- Codex will not automatically load this file when operating in that task directory.

Mitigation:

- For Codex, generate `docs/tasks/{name}/AGENTS.md` or add Codex-specific task context instructions.
- Update Codex task skills to explicitly read `task-state.md` and indexed documents before acting.
- Treat task-local auto-loading as optional convenience, not the source of truth.

### 3. Permission Model Differences

Claude skills update `.claude/settings.local.json` with read/bash permissions.

Risk:

- A Codex adapter that blindly copies these instructions would configure the wrong agent.

Mitigation:

- Mark `set-claude-permission` as Claude-only.
- Create a separate Codex setup skill only if there is a concrete Codex permission/config file to manage.
- Keep `~/.ai-skills/config.json` as agent-neutral shared config.

### 4. Resource Path Resolution

Skills read resources from `{repo}/skills/.../resource/...` based on `~/.ai-skills/config.json`.

Risk:

- Generated Codex skills under `~/.codex/skills/` may lose access to related templates if they assume relative paths.

Mitigation:

- Preserve `~/.ai-skills/config.json` as the canonical repository locator.
- Do not duplicate all resources into Codex skills initially.
- Where resources are needed frequently, copy them into the Codex skill directory later as an optimization.

### 5. Source Format Is Claude Command-oriented

The current source format requires H1 command names and may include slash command usage.

Risk:

- The canonical files become cluttered if they try to satisfy both Claude and Codex directly.

Mitigation:

- Add a transformation step rather than rewriting every source file manually.
- Add target metadata for descriptions, exclusions, and special transforms.
- Consider a later migration from `SK-*.md` to an agent-neutral source naming scheme only after both targets are stable.

### 6. Generated-file Ownership

Claude has a manifest, Codex has skill directories, and future targets may add more generated output.

Risk:

- Users may hand-edit generated artifacts and lose changes on rebuild.

Mitigation:

- Put generated warnings at the top of generated files.
- Keep source metadata and target generated output clearly separated.
- Add validation that generated output is up to date when practical.

## Validation Strategy

Validation should be established before the adapter work becomes large. The project should treat every phase as a compatibility gate:

- Claude must remain valid for all currently supported behavior at every phase.
- Codex must be valid for the capabilities implemented up to that phase.
- Automated validation should cover deterministic behavior: manifests, generated files, paths, metadata, installer dry-runs, and text invariants.
- Smoke validation should cover agent-facing usability: the generated command or skill can be found, read, and used in a representative workflow.

### Automated Validation Scope

Use lightweight Node-based tests rather than a large test framework. The recommended baseline is Node's built-in `node:test` runner executed through `tsx`.

Suggested scripts:

```json
{
  "scripts": {
    "lint:check": "eslint scripts/**/*.ts skills/*/resource/*.ts tests/**/*.ts",
    "lint:fix": "eslint scripts/**/*.ts skills/*/resource/*.ts tests/**/*.ts --fix",
    "typecheck": "tsc --noEmit",
    "test": "tsx --test tests/**/*.test.ts",
    "verify": "pnpm lint:check && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

After Codex build support exists, extend `verify`:

```json
{
  "scripts": {
    "verify": "pnpm lint:check && pnpm typecheck && pnpm test && pnpm build && pnpm build:codex"
  }
}
```

Recommended test structure:

```text
tests/
  fixtures/
  build-claude.test.ts
  build-codex.test.ts
  setup-claude.test.ts
  setup-codex.test.ts
  skill-metadata.test.ts
  task-workflow.test.ts
```

Installer tests should run against a temporary home directory rather than the real user home. Setup scripts should therefore support injected paths through environment variables or parameters, for example:

- `HOME`
- `AI_SKILLS_HOME`
- `CLAUDE_HOME`
- `CODEX_HOME`
- `AISK_REPO_ROOT`

The exact variable names can be chosen during implementation, but the important requirement is that tests must not write to real `~/.claude`, `~/.codex`, or `~/.ai-skills`.

### Claude Validation

Claude validation should cover all implemented and testable behavior from the beginning because Claude is the existing supported target. Installer dry-run coverage becomes mandatory once setup scripts support temporary home injection in Phase 2.

Automated checks:

- `pnpm lint:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `claude/setting.json` is stable and valid JSON.
- Every Claude manifest entry points to an existing source file.
- Every generated Claude destination is under `.claude/commands/aisk/`.
- Claude-only files remain included in the Claude target.

Smoke checks:

- Run the Claude installer against a temporary home.
- Verify expected command files exist under temp `~/.claude/commands/aisk/`.
- Verify stale generated command files are removed.
- Verify non-target files are not touched.

### Codex Validation

Codex validation grows by phase.

Before Codex builder exists:

- Validate that Codex guidance files and target metadata are well-formed.
- Validate that Claude-only skills are explicitly marked or otherwise accounted for.

After Codex builder exists:

- `pnpm build:codex`
- `codex/setting.json` is stable and valid JSON.
- Every Codex manifest entry points to an existing source file.
- Claude-only skills do not appear in the Codex target.
- Generated Codex names use the expected `aisk-*` namespace.

After Codex installer exists:

- Run the Codex installer against a temporary home.
- Verify `~/.codex/skills/<name>/SKILL.md` exists for every manifest entry.
- Verify each `SKILL.md` has YAML frontmatter with `name` and `description`.
- Verify generated `SKILL.md` files do not contain unsupported Claude-only install assumptions.
- Verify stale generated `aisk-*` Codex skills are removed.
- Verify non-aisk Codex skills are untouched.

### Smoke Validation Limits

Some behavior cannot be fully automated:

- whether Codex skill trigger descriptions fire at exactly the right time,
- whether Claude or Codex consistently follow long natural-language workflows,
- whether task-mode instructions are ergonomically sufficient in a real session.

These should be tracked with smoke checklists, not used as strict CI gates. A smoke checklist is still valuable and should include at least:

- one Claude command install and read check,
- one Codex skill install and read check,
- one agent-neutral skill generated for both targets,
- one Claude-only skill excluded from Codex,
- one task workflow check after task support is implemented.

## Implementation Phases

### Phase 0: Validation Foundation

Purpose: create the validation platform before changing the target architecture.

Tasks:

- Split lint scripts into non-mutating `lint:check` and mutating `lint:fix`.
- Add `typecheck`, `test`, and `verify` scripts.
- Update `tsconfig.json` so `tests/**/*.ts` is typechecked once tests exist.
- Add a `tests/` directory using `node:test` through `tsx`.
- Add helper utilities for temporary homes and isolated fixture workspaces.
- Add baseline Claude build tests for `claude/setting.json`.
- Add baseline installer tests for Claude using a temporary home, if the current setup script can support it without broad refactoring.
- Document smoke validation expectations in this blueprint or a dedicated checklist.

Acceptance:

- `pnpm verify` passes.
- Claude validation for implemented checks is available; temp-home installer coverage has a clear tracked gap if setup injection is not yet implemented.
- No test writes to real `~/.claude`, `~/.codex`, or `~/.ai-skills`.

Per-phase gate:

- Claude: all validation implemented in this phase must pass; any missing temp-home installer coverage must be documented as a Phase 2 blocker.
- Codex: no generated target yet; validate only that future Codex checks are documented.

### Phase 1: Repository Guidance and Baseline Compatibility

Purpose: make the repository understandable to Codex before changing behavior.

Tasks:

- Add root `AGENTS.md` with agent-neutral maintenance instructions.
- Update the blueprint as the source of truth for Codex adapter work.
- Record current behavior with baseline commands:
  - `pnpm verify`
  - `pnpm build`

Acceptance:

- Codex can enter this repo and understand maintenance rules without reading `CLAUDE.md`.
- Existing Claude build behavior remains unchanged.

Per-phase gate:

- Claude: `pnpm verify` and `pnpm build` pass.
- Codex: `AGENTS.md` exists and does not instruct Codex to use Claude-only commands as Codex features.

### Phase 2: Normalize Existing Structure

Purpose: remove ambiguity before adding a second target.

Tasks:

- Rename or wrap `scripts/setup.ts` as Claude-specific setup.
- Fix `create-skill.ts` so generated skills follow the `SK-{command}.md` convention.
- Move canonical skill source-format documentation out of `.claude/`.
- Reconcile `/aisk/sync` references and stale docs.
- Reconcile `claude/setting.json` description preservation docs with actual builder behavior.
- Make setup/build scripts testable with temporary homes and fixture repository roots.

Acceptance:

- Existing Claude installation still works.
- New skills created by the repository follow the same naming convention as existing skills.
- Canonical format docs no longer depend on `.claude/` as the source of truth.

Per-phase gate:

- Claude: full build and temp-home installer validation pass.
- Codex: guidance and source-format docs remain agent-neutral where intended.

### Phase 3: Add Target Metadata

Purpose: make target inclusion and target descriptions explicit.

Tasks:

- Choose metadata storage:
  - sidecar files near each skill, or
  - central `skills/manifest.json`.
- Add target metadata for all current skills.
- Mark Claude-only skills explicitly.
- Add Codex names and descriptions for the first supported skills.
- Add metadata schema validation tests.

Acceptance:

- A script can determine whether each skill targets Claude, Codex, both, or neither.
- Claude-only exclusions are data-driven, not hardcoded.
- Metadata is stored centrally in `skills/manifest.json`.

Per-phase gate:

- Claude: full validation remains green and Claude target membership is unchanged unless intentionally documented.
- Codex: metadata validation passes; initial Codex scope is machine-readable.

### Phase 4: Add Codex Manifest Builder

Purpose: generate a reviewable Codex target manifest.

Tasks:

- Add `scripts/build-codex.ts`.
- Scan valid source skills.
- Apply target metadata.
- Infer Codex skill names and descriptions when metadata is absent.
- Write `codex/setting.json`.
- Add `pnpm build:codex`.
- Add automated tests for Codex manifest shape, target filtering, stable output, and non-interference with Claude output.

Acceptance:

- `pnpm build:codex` creates a stable manifest.
- It does not modify `claude/setting.json`.
- Unsupported Claude-only skills do not appear in the Codex manifest.
- Phase 4 generates `codex/setting.json` only; Codex `SKILL.md` output is generated in Phase 5.

Per-phase gate:

- Claude: full validation remains green.
- Codex: `pnpm build:codex` and Codex manifest tests pass.

### Phase 5: Add Codex Installer and Transform

Purpose: install usable Codex skills globally.

Tasks:

- Add `scripts/setup-codex.ts`.
- Write or refresh `~/.ai-skills/config.json` with this repo path.
- Generate `~/.codex/skills/<name>/SKILL.md` for each Codex manifest entry.
- Add YAML frontmatter with `name`, `description`, and `metadata.short-description`.
- Transform Claude slash-command usage into Codex-compatible instructions.
- Remove stale generated `aisk-*` Codex skills without touching other Codex skills.
- Add `pnpm register:codex`.
- Add temp-home installer tests for Codex.

Acceptance:

- `pnpm register:codex` installs valid Codex skill directories.
- Existing non-aisk Codex skills are untouched.
- Generated `SKILL.md` files are readable and do not pretend slash commands exist in Codex.
- Installer tests cover temporary Codex home installation and stale generated skill cleanup.

Per-phase gate:

- Claude: full validation remains green.
- Codex: manifest builder, installer, transform, and temp-home tests pass.

### Phase 6: Adapt Task Workflow for Codex

Purpose: make task workflows reliable across sessions and agents.

Tasks:

- Split task context into shared and target-specific resources.
- Add `resource-codex.md` if Codex task-local instructions are needed.
- Update Codex task instructions to read `task-state.md` and indexed documents explicitly.
- Decide whether Codex-created task directories should include `AGENTS.md`.
- Keep Claude-created `.claude/CLAUDE.md` behavior unchanged.
- Add fixture-based task workflow tests.

Acceptance:

- A Codex-created task has enough local context for future Codex sessions.
- Claude-created tasks remain compatible with Claude.
- Task state remains the source of truth across both agents.

Per-phase gate:

- Claude: full task workflow validation remains green.
- Codex: task workflow generation tests and task smoke checklist pass for implemented behavior.

### Phase 7: Documentation and Release Hardening

Purpose: make the multi-target workflow safe to maintain.

Tasks:

- Run:
  - `pnpm verify`
  - `pnpm build`
  - `pnpm build:codex`
- Run Claude and Codex temp-home installer tests.
- Run smoke validation:
  - one agent-neutral skill generated for both targets,
  - one task skill if task support is enabled,
  - one excluded Claude-only skill absent from Codex,
  - one non-aisk Codex skill preserved by installer cleanup.
- Update README and `docs/OVERVIEW.md` for multi-target usage.

Acceptance:

- Claude and Codex build paths both work.
- Documentation describes current behavior accurately.
- Generated artifacts are either committed intentionally or reproducible from source.

Per-phase gate:

- Claude: full validation and smoke checks pass.
- Codex: all implemented Codex validation and smoke checks pass.

## Initial Codex Scope

Include first:

- `arch/SK-refresh-arch.md`
- `arch/SK-check-arch.md`
- `smart-review/SK-smart-review.md`
- `setup-precommit/SK-setup-precommit.md`

Include after task-context adaptation:

- `task/SK-create-task.md`
- `task/SK-start-task.md`
- `task/SK-resume-task.md`
- `task/SK-verify-step.md`
- `task/SK-verify-task.md`
- `task/SK-complete-task.md`
- walkthrough skills

Exclude initially:

- `set-claude-permission`
- `init-project`
- `create-skill`

`create-skill` can be included only after it describes Codex distribution accurately and the naming inconsistency is fixed.

## Open Questions

- Should `pnpm register` eventually install both Claude and Codex targets, or should it stay Claude-only?
- Should generated Codex skills be committed under `codex/generated/` for review, or only installed into `~/.codex/skills/`?
- Should target metadata live in sidecars or a central registry?
- Should the source format eventually evolve to agent-neutral names, for example `skills/task/create-task.md`, while keeping `SK-` as a Claude compatibility layer?
- Should task directories use both `.claude/CLAUDE.md` and `AGENTS.md`, or should all agent-specific task context be avoided?

## Recommended Next Step

Start with Phase 0 and Phase 1. Those changes improve the repository even before Codex support is installed, and they reduce the chance that the Codex adapter bakes in current Claude-only assumptions.
