# poc

PoC skill. Confirms the unit is installed and displays resource content.

**步骤**

1. 输出安装信息（组件列表和依赖状态）
2. 读取 `.aisk/poc-unit/resources/readme.md`（若文件不存在，输出错误提示并停止）
3. 展示文件内容

**输出格式**

```
poc-unit 已安装 ✓
组件：skill (poc), rule (poc-rule), script (poc-hook), resource (readme)
依赖：poc-dep-unit ✓

--- readme.md ---
{file content}
```
