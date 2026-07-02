# commit

提交前运行检查清单，确保代码质量和流程规范，再执行 git commit。

---

## 触发条件

用户请求提交代码（"提交"、"commit"、"帮我提交"、"创建 commit"）时加载本 skill。

## 约束

- **阻塞项**（verify 失败、commit message 格式错误）→ 停止执行，等待修复
- **警告项**（测试覆盖、changeset、debug 残留）→ 列出后询问用户是否确认继续
- 用户明确说 "强制提交" 或 "skip checks" → 跳过全部检查直接提交
- 不自动暂存文件；若无已暂存内容，先询问用户

## 输入

`$ARGUMENTS`：可选的提交消息。提供后跳过第三步的消息询问。

---

## 步骤

### 第一步 — 读取变更上下文

```bash
git status --short
git diff --cached --name-only
git diff --name-only HEAD
```

若 `git diff --cached --name-only` 为空（无已暂存文件）：
→ 询问用户是否暂存所有变更（`git add -A`）
→ 用户拒绝 → 提示手动暂存后重新运行，**停止**

### 第二步 — 运行 verify（阻塞项）

检测 verify 命令（按优先级）：

1. `package.json` 中存在 `"verify"` script → `pnpm verify`（或 `npm run verify`）
2. 无 `verify` script → `pnpm test`（或 `npm test`）
3. 非 JS/TS 项目 → 跳过，报告"未检测到 verify 命令，已跳过"

运行结果：

- **成功** → ✓，继续
- **失败** → 展示完整错误输出，**立即停止**，告知用户修复后重新运行

### 第三步 — 自动化检查

逐项执行，记录 ✓ / ✗：

#### 3.1 测试覆盖

```bash
git diff --name-only HEAD
```

判断逻辑：

- 全部变更均为文档/配置（`*.md`、`*.json`、`*.yml`、`*.yaml`、`*.toml`）→ ✓ 跳过
- 有源码变更（`*.ts`、`*.js`、`*.tsx`、`*.jsx`、`src/`、`lib/`、`app/`）但**无**测试变更（`*.test.*`、`*.spec.*`、`tests/`、`__tests__/`）→ ✗ 警告，列出无测试覆盖的源码文件
- 有测试变更 → ✓

#### 3.2 Changeset（仅 NPM 包项目）

```bash
ls .changeset/ 2>/dev/null && echo "exists"
```

若 `.changeset/` 存在：

```bash
git diff --name-only HEAD -- '.changeset/*.md'
```

判断逻辑：

- `.changeset/` 不存在 → ✓ 跳过（非 changeset 项目）
- 存在但本次无新增 `.changeset/*.md` → ✗ 警告："NPM 包项目，建议添加 changeset 说明版本变更"
- 有新增 changeset 文件 → ✓

#### 3.3 Debug 残留

```bash
git diff HEAD | grep -n "^\+" | grep -E "(console\.(log|debug|warn)|debugger;)"
```

- 有匹配项 → ✗ 警告，展示文件和行号
- 无匹配项 → ✓

#### 3.4 提交消息格式（阻塞项）

若 `$ARGUMENTS` 未提供提交消息，询问用户输入。

验证格式：

```
<type>(<scope>): <description>
```

- `type` 限定：`feat`、`fix`、`chore`、`refactor`、`docs`、`test`、`style`、`perf`
- 不符合 → ✗ **阻塞**，展示正确格式示例，要求用户重新输入

### 第四步 — Claude 评估（无需运行命令）

基于 `git diff HEAD` 内容判断：

1. **意外文件**：是否有不应提交的文件（`.env`、`*.log`、`dist/`、`node_modules/`、构建产物）？
2. **文档同步**：若 API 有变更（函数签名、导出接口、配置项），相关文档是否同步更新？
3. **测试质量**（若有测试变更）：测试是否有实质内容（非空测试、非仅改注释/描述文字）？

### 第五步 — 汇总报告

输出格式：

```
提交前检查报告
══════════════════════════════════════
✓  verify 通过
✗  测试覆盖：src/foo.ts 有变更但无测试更新     [警告]
✓  Changeset：已添加 .changeset/abc.md
✗  Debug 残留：src/bar.ts +42 console.log()   [警告]
✓  提交消息格式正确

Claude 评估：
⚠  文档同步：修改了 Installer.add() 签名，README 未更新
✓  测试质量：新增测试包含实质断言
✓  无意外文件
══════════════════════════════════════
提交消息：feat(commit): add pre-commit checklist skill
```

**有阻塞项** → 停止，列出需修复的内容，等待用户处理后重新运行
**仅有警告项** → 列出警告后询问用户："以上警告项是否确认继续提交？"

### 第六步 — 执行提交

用户确认后执行：

```bash
git commit -m "$(cat <<'EOF'
<commit-message>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

提交成功后报告完成，输出 commit hash。
