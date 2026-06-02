# setup-precommit

使用 husky 和 lint-staged 为当前 Node.js 项目配置 git pre-commit hook。

---

## 约束

- [写操作] 写入 `package.json`（添加 `lint-staged` 配置和 `prepare` 脚本）和 `.husky/pre-commit`
- 仅适用于 Node.js 项目；若项目根目录未找到 `package.json` 则停止
- 未经用户确认不覆盖已存在的 `.husky/pre-commit`

## 步骤

### 第一步 — 前置条件

1. 检查项目根目录是否存在 `package.json`。若不存在，输出：

   > This skill is for Node.js projects only. No `package.json` found.
   > Then stop.

2. 检查 `.husky/pre-commit` 是否已存在。
   - 若已存在：读取并展示其内容；询问 "A husky pre-commit hook already exists. Overwrite it?"
     等待确认；若拒绝则停止。

### 第二步 — 检测工具链

读取 `package.json` 并收集：

- **ESLint**：若 `devDependencies` 或 `dependencies` 中包含 `eslint` 则视为存在
- **Prettier**：若 `devDependencies` 或 `dependencies` 中包含 `prettier` 则视为存在
- **已有 lint-staged**：检查 `package.json` 中是否已有 `lint-staged` 字段
- **包管理器**：检查 `pnpm-lock.yaml` → pnpm；`yarn.lock` → yarn；否则 npm

扫描 `devDependencies`/`dependencies` 中的框架标识符（如 `@types/react` → 包含 `.tsx`）。

### 第三步 — 构建 lint-staged 配置

根据检测到的工具构建 `lint-staged` 配置：

- TypeScript/JavaScript 文件（`"*.{ts,tsx,js,jsx}"`）：
  - 若存在 ESLint，添加 `"eslint --fix"`
  - 若存在 Prettier，添加 `"prettier --write"`
- 标记/数据文件（`"*.{md,json,yaml,yml}"`）：
  - 若存在 Prettier，添加 `"prettier --write"`

若某个 glob 模式没有需要添加的命令，则完全跳过。

若 ESLint 和 Prettier 均未检测到，警告用户并询问是否继续使用空的 lint-staged 配置（此时 hook 实际上不执行任何操作）。

### 第四步 — 预览并确认

写入任何内容之前，展示组合预览：

```
lint-staged config to be added to package.json:
{ "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"], ... }

.husky/pre-commit:
npx lint-staged
```

等待用户确认。

### 第五步 — 安装 husky 和 lint-staged

检查 `devDependencies`，使用检测到的包管理器安装缺少的包：

- pnpm：`pnpm add -D husky lint-staged`
- yarn：`yarn add -D husky lint-staged`
- npm：`npm install --save-dev husky lint-staged`

跳过 `devDependencies` 中已存在的包。

### 第六步 — 初始化 husky 并写入 hook

1. 运行 `npx husky init` —— 创建 `.husky/` 目录并向 `package.json` 添加 `"prepare": "husky"`。
2. 将 `lint-staged` 对象添加到 `package.json`，保留所有已有字段。
3. 用以下内容覆盖 `.husky/pre-commit`：
   ```sh
   npx lint-staged
   ```

### 第七步 — 验证

运行 `ls -la .husky/pre-commit` 确认文件存在，然后输出一行已配置内容的摘要。

---

## 注意事项

- `.husky/pre-commit` 会提交到 git —— 所有团队成员在 `npm install` 后自动获得此 hook
- 不提交时测试：在项目根目录运行 `npx lint-staged`
- 若项目后续添加了 ESLint 或 Prettier，重新运行本 skill 以更新配置
