# Project Info Collection (Monorepo)

## Basic Info

**Project name**:
**Project description**:
**Monorepo tool**: (e.g. Turborepo, Nx, pnpm workspaces)

## Package List

Fill in one section per app or package:

---

### Package: <name> (e.g. web / api / admin)

**Path**: (e.g. apps/web)
**Type**: (frontend / backend / shared library / tooling)
**Frontend framework**:
**UI library**:
**Backend / API layer**:
**Database**:
**Other key dependencies**:
**Directory structure**: (paste directory tree or describe)

---

### Package: <name>

(Repeat the structure above)

---

## Shared Config

**Shared code location**: (e.g. packages/shared, packages/ui)
**Cross-package dependency rules**: (e.g. api must not import web; shared must not import apps)
**CI/CD**: (e.g. GitHub Actions + Turborepo remote cache, etc.; optional)
**Unified tooling**: (ESLint config, TypeScript base config, test framework, etc.)

## AI Tool Support

**Claude Code**: required. Always generates `CLAUDE.md` (root and per package) and Claude Code slash commands.

Select additional tools as needed. Unselected tools will not have their config files generated:

- [ ] OpenAI Codex / ChatGPT → generates `AGENTS.md`
- [ ] Cursor IDE → generates `.cursorrules`
- [ ] GitHub Copilot → generates `.github/copilot-instructions.md`
- [ ] Other:

## Confirmed Architecture Decisions

Each independent technology choice or design constraint counts as one ADR:

1.
2.
3.

## Project Phase System

- [ ] Use default: Phase 0 Foundation -> Phase 1+ Feature Development
- [ ] Custom phase description (see below):
- [ ] No phase model

Custom phase description (if selected):

## Other Architecture Info / Background

(Free-form, paste as much as you like)
