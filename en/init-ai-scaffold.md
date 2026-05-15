# /init-ai-scaffold — Initialize AI Engineering Scaffold

Sets up a standardized AI-assisted development convention system in your project. Supports new projects, existing projects, and monorepos. Generates: multi-tool config files, convention docs, ADR system, and Claude Code slash commands.

**All generated Markdown convention files are written in English.**

> Maintenance note: this document describes workflow and decision rules only. Long output templates are maintained in
> `init-ai-scaffold-templates/`. The Simplified Chinese version `../zh-CN/init-ai-scaffold.md` stays in sync with this file,
> and its templates live in `../zh-CN/init-ai-scaffold-templates/`.

---

## Template Index

When full template content must be output or written, use these files as the source of truth:

| Scenario | Template file |
| -------- | ------------- |
| New single-package project info form | `init-ai-scaffold-templates/project-info.single.md` |
| New monorepo project info form | `init-ai-scaffold-templates/project-info.monorepo.md` |
| Conflict detection prompt | `init-ai-scaffold-templates/conflict-resolution.md` |
| `CLAUDE.md` / `AGENTS.md` / Copilot / Cursor templates | `init-ai-scaffold-templates/config-files.md` |
| Claude Code slash command templates | `init-ai-scaffold-templates/slash-commands.md` |
| Completion summary template | `init-ai-scaffold-templates/completion-summary.md` |

When changing any template, check whether the corresponding Chinese file also needs the same content update.

---

## Background: Core Concepts

### Test Classification

- **Learning tests**: Validate understanding of third-party library/API behavior. Do not run in CI; delete freely.
- **Production tests**: Verify business logic correctness. Run in CI; maintain long-term as a refactoring safety net.

### Project Phase System (optional, mainly for new projects)

| Phase | Name | Description |
| ----- | ---- | ----------- |
| Phase -1 | AI Scaffold | Run this command to establish the convention system |
| Phase 0 | Foundation | Project skeleton, CI/CD, base dependencies |
| Phase 1+ | Feature Development | Iterative feature delivery |

Existing projects may skip this or define custom phase descriptions in the info collection form.

### Monorepo Convention Layering Model

Monorepo projects use a two-layer convention system:

| Layer | Location | Content |
| ----- | -------- | ------- |
| Shared | `docs/conventions/` | Rules that apply to all packages, such as commit conventions and cross-package dependency constraints |
| Package-specific | `<pkg-path>/docs/conventions/` | Rules that override or extend the shared layer for a package, such as frontend component rules or backend API design rules |

Each package's `CLAUDE.md` uses Claude Code's native recursive loading: when working inside a package directory, Claude Code reads `CLAUDE.md` from that directory and all parent directories. Package-specific rules take precedence on conflict.

---

## Step 0: Determine Project Type

**Part 1: New vs Existing project** (determines whether to go to 1A or 1B)

A project is **new** only if all of the following are true:

- No dependency manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.)
- No source directories (`src/`, `app/`, `apps/`, `lib/`, etc.)
- No existing business code files

If any condition is not met, treat it as an existing project.

**Part 2: Single-package vs Monorepo** (determines which template to use within 1A/1B)

Treat as a monorepo if any of the following exist:

- `pnpm-workspace.yaml` / `turbo.json` / `nx.json` / `lerna.json`
- `workspaces` field in `package.json`
- An `apps/` or `packages/` directory whose subdirectories each contain their own `package.json`

---

## Step 1A: New Project — Output Info Collection Template

Based on Part 2 of Step 0, output the matching template:

- Single-package project: `init-ai-scaffold-templates/project-info.single.md`
- Monorepo project: `init-ai-scaffold-templates/project-info.monorepo.md`

Ask the user to fill it in and paste it back, or provide a file path.

Once the user's input is received, proceed to **Step 2**.

---

## Step 1B: Existing Project — Index Project and Extract Info

### 1B-1. Conflict Detection (run first)

Before reading anything, check whether any of the following paths already exist:

**Root level**

```text
CLAUDE.md
AGENTS.md
.cursorrules
.github/copilot-instructions.md
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**Monorepo package level** (check per package if monorepo was detected)

```text
<pkg-path>/CLAUDE.md
<pkg-path>/docs/conventions/
```

> `AGENTS.md`, `.cursorrules`, and `.github/copilot-instructions.md` are conditionally generated files. If the user does not select the corresponding tool, conflicts on these paths can be ignored.

If any path exists, use `init-ai-scaffold-templates/conflict-resolution.md` to output the conflict list and pause until the user explicitly chooses how to proceed.

### 1B-2. Index Project

**Single-package project indexing**

- Read `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml`, etc. to identify frameworks, dependencies, and tooling
- List the top-level directory structure at depth 2-3
- Inspect `README.md`, `CONTRIBUTING.md`, `.eslintrc`, `tsconfig.json`, etc. and extract existing conventions
- Check for `docs/adr/` or similar directories and list existing decision titles
- Check `.github/workflows/`, `Dockerfile`, etc. for CI/CD setup
- Check for commitlint / semantic-release config and identify the existing commit convention

**Additional monorepo indexing**

- Identify monorepo tooling and workspace config
- List all apps / packages and their paths
- Run single-package indexing per package and summarize tech stack differences
- Extract root shared config such as ESLint, TypeScript base config, and turbo pipeline
- Extract workspace references from package `dependencies` to map cross-package dependencies

### 1B-3. Output Pre-filled Info Collection Form

Based on indexing results, choose the matching format and pre-fill known fields. Add this note at the top:

```markdown
<!-- The following content was generated from project indexing. Please verify and edit. -->
```

Ask the user to confirm or edit it. Once confirmed, proceed to **Step 2**.

---

## Step 2: Create Directory Structure

Create these directories based on the user's input. Skip paths that already exist.

**All projects (root level)**

```text
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**Only if the user selected GitHub Copilot**

```text
.github/
```

**Additional monorepo paths (one per app/package)**

```text
<pkg-path>/docs/conventions/
```

---

## Step 3: Generate Config Files

Generate only the matching version based on Step 0 results (single-package / monorepo) and the user's AI tool selections. Do not keep unused branches.

**Always generated (all projects)**

- `CLAUDE.md` (root; Monorepo also requires a package-level `CLAUDE.md` for each package)

**Conditionally generated based on AI tool selection**

| Config file | Condition |
| ----------- | --------- |
| `AGENTS.md` | User selected Codex / ChatGPT |
| `.cursorrules` | User selected Cursor |
| `.github/copilot-instructions.md` | User selected GitHub Copilot |

Config file templates are maintained in: `init-ai-scaffold-templates/config-files.md`.

### Commit Convention Format

Use Conventional Commits. New projects use it by default; existing projects follow the convention found during indexing.

**Single-package:**

```text
type(scope): description

feat(auth): implement JWT refresh token
fix(ci): resolve pipeline timeout
chore(deps): upgrade drizzle to v0.30
```

**Monorepo:**

```text
type(pkg/scope): description

feat(web/auth): implement login page
feat(api/auth): add JWT refresh endpoint
fix(shared/ui): fix Button hover state
```

> Note: if scope contains `/` and the project uses commitlint, relax scope format validation in `.commitlintrc` (`scope-case: [0]` or a custom regex). The generated `docs/conventions/coding.md` should include this note.

---

## Step 4: Generate Convention Files

If information is insufficient for any file, generate a version with `[TBD]` placeholders.

### Single-package

Generate in `docs/conventions/`:

| File | Key contents |
| ---- | ------------ |
| `README.md` | Convention file index, update process, health check instructions |
| `architecture.md` | Tech stack table, architecture layers, prohibited patterns, rules for adding new dependencies |
| `coding.md` | TypeScript rules, naming conventions, comment rules, export rules; Next.js Server Component / `use client` boundaries; commit convention; no long code examples |
| `testing.md` | Learning vs production test classification, what to test / what not to test, tool versions, file organization rules |
| `directory.md` | Directory tree based on user input; optionally append a new-file decision tree for complex structures |
| `ai-workflow.md` | AI tool selection matrix, convention conflict decision framework |

`ai-workflow.md` records the project's AI tool selection rationale and convention conflict decision framework. Both Claude Code and Codex can reference it.

Existing projects: if conventions are extracted from `CONTRIBUTING.md` or README, integrate them and note the source. If a commitlint config exists, incorporate the commit convention into `coding.md`.

### Monorepo

**Root shared conventions** (`docs/conventions/`)

| File | Key contents |
| ---- | ------------ |
| `README.md` | Convention layering explained (shared + package-specific), update process |
| `architecture.md` | Monorepo-wide architecture, package inventory and responsibilities, cross-package dependency rules, prohibited patterns |
| `coding.md` | Cross-package coding standards, commit convention and commitlint config notes; no long code examples |
| `testing.md` | Cross-package testing standards |
| `directory.md` | Top-level monorepo directory tree, cross-package directory conventions |
| `ai-workflow.md` | AI tool selection matrix, cross-package development scenarios, convention conflict decision framework |

**Package-specific conventions** (`<pkg-path>/docs/conventions/`)

Generate only files with substantive differences from the shared layer:

| Package type | architecture.md | coding.md | testing.md | directory.md |
| ------------ | :-------------: | :-------: | :--------: | :----------: |
| Frontend (React / Next.js etc.) | framework rules, component conventions | component boundary rules; Next.js Server Component / `use client` boundaries | if different | if different |
| Backend (REST / GraphQL etc.) | API design rules, service layer structure | service layer rules | if different | if different |
| Shared library / UI package | if different | public API design, backward compatibility rules | if different | if different |

"if different": only create the file if the package-level rules differ from the shared conventions.

### Tech Stack-Specific Conventions (as needed)

Placement rule: if only one package uses a technology, put the file in that package's directory; if multiple packages use it, put it in the root shared conventions.

| Technology | File | Key contents |
| ---------- | ---- | ------------ |
| GraphQL | `graphql.md` | Query/mutation/fragment rules, cache tags |
| REST API | `api-design.md` | Endpoint naming, error format, versioning strategy |
| Database | `database.md` | Migration rules, naming conventions, query patterns |

---

## Step 5: Generate ADR Files

### `docs/adr/README.md` (required)

Contents:

- When to create an ADR (criteria: affects multiple modules, hard to reverse, involves external dependency selection)
- ADR granularity: one ADR per independent technology choice or design constraint
- Monorepo note: all decisions go in root `docs/adr/`; use a package name prefix in the filename to scope them (e.g. `0002-web-use-nextjs-app-router.md`); only create package-level ADR directories if the team explicitly requests it
- Decision index table (empty initially; maintained by `/adr` in Claude Code, or by the ADR workflow in `AGENTS.md` for Codex)
- ADR file template

### Initial ADRs

Create one ADR file per confirmed architecture decision:

```text
docs/adr/<four-digit-number>-<kebab-case-title>.md
```

Monorepo package-scoped example: `docs/adr/0002-web-use-nextjs-app-router.md`.

Existing projects: if `docs/adr/` already contains files, continue from the highest existing number. Do not overwrite existing files.

---

## Step 6: Generate Claude Code Slash Commands

Claude Code slash command templates are maintained in: `init-ai-scaffold-templates/slash-commands.md`.

Generate these files:

- `.claude/commands/check-conventions.md`
- `.claude/commands/update-convention.md`
- `.claude/commands/adr.md`

---

## Step 7: Output Completion Summary

Based on Step 0 results, output only the matching "Next Steps" version.

Completion summary template: `init-ai-scaffold-templates/completion-summary.md`.

---

## Notes

- **All generated Markdown convention files are written in English**
- **Generate only the matching version**: for all branching templates, select the correct version based on Step 0 results (single-package / monorepo) and the user's AI tool selections; do not include unused branches in generated files
- **File overwrite protection**: existing projects pause at Step 1B-1 for conflict resolution; new projects check file-by-file in Step 2 and skip existing files by default unless the user confirms overwrite
- Generate content based on user-provided information, including free-form "Other Architecture Info"; do not fabricate uncertain technical decisions
- If a convention file cannot be filled due to insufficient info, generate a version with `[TBD]` placeholders
- ADR granularity: one ADR per independent technology choice or design constraint
- **Monorepo package-specific conventions**: use the matrix in Step 4 to determine which files to generate; avoid redundancy
- Indexing results for existing projects are a pre-fill reference only; user-confirmed content takes precedence
