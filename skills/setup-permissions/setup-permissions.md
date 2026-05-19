# setup-permissions

生成或更新 .claude/settings.json，添加常用权限白名单。

**约束**
- [写操作] 只写 .claude/settings.json
- 合并而非覆盖：已有规则保留，只追加缺失的默认规则

**步骤**
1. 读取 .claude/settings.json（不存在则从空对象开始）
2. 合并以下默认 allow 规则（已存在的跳过）：
   - Bash: git status / git diff / git log / git add
   - Bash: cat / ls / find / grep
   - Bash: npm run（读取 package.json scripts）
3. 写入更新后的 settings.json
4. 输出变更摘要（新增了哪些规则，跳过了哪些）
