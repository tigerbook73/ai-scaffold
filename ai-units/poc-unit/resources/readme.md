poc-unit: 这是一个完整覆盖 PoC 单元，包含 skill、rule guard、script hook 和 resource 四种组件类型。

安装后可验证：
- skill 调用（/aisf:poc-unit:poc）
- rule guard 生效（[POC_RULE_ACTIVE] 标记出现在回复中）
- pre-commit hook 执行（.aisf/poc-unit/hook-log.txt 追加时间戳）
- resource 读取（此文件内容可被 skill 读取并输出）
