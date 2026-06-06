---
# AISF:CUSTOM name="globs" hint="扫描项目中的测试文件找出实际使用的文件后缀和目录结构，推荐合适的 glob patterns"
globs: ["**/*.poc-test.*"]
# AISF:CUSTOM:END
description: poc Next.js 规则验证（PoC，可选）
---

**规则**：在处理匹配 `globs` 的文件时，每次回复结尾必须包含标记 `[POC_NEXTJS_RULE_ACTIVE]`。

此规则用于验证可选组件安装逻辑（仅在 Next.js 项目中安装）。
