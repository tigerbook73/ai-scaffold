# poc-dep

PoC dependency skill. Confirms the unit is installed and displays its resource content.

**步骤**

1. 输出确认信息：`poc-dep-unit 已安装 ✓`
2. 读取文件 `.aisf/poc-dep-unit/resources/info.md`（若文件不存在，输出错误提示并停止）
3. 展示文件内容

**输出格式**

```
poc-dep-unit 已安装 ✓

--- info.md ---
{file content}
```
