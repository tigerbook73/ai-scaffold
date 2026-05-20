#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// 解析 --target 参数，默认为当前目录
const args = process.argv.slice(2);
const targetIdx = args.indexOf('--target');
const targetDir = targetIdx !== -1 ? path.resolve(args[targetIdx + 1]) : process.cwd();

// 读取全局配置，获取 repo 路径
// 允许通过环境变量覆盖，方便测试
const configFile = path.join(os.homedir(), '.ai-skills', 'config.json');
if (!fs.existsSync(configFile)) {
  console.error('错误：~/.ai-skills/config.json 不存在。');
  console.error('请先在 ai-skills 仓库中运行：node scripts/setup.js');
  process.exit(1);
}

const { repo } = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const claudeSourceDir = path.join(repo, 'claude');
const fileTreePath = path.join(claudeSourceDir, 'file-tree.json');

if (!fs.existsSync(fileTreePath)) {
  console.error(`错误：未找到 file-tree.json（${fileTreePath}）`);
  process.exit(1);
}

const { files } = JSON.parse(fs.readFileSync(fileTreePath, 'utf8'));
const claudeTargetDir = path.join(targetDir, '.claude');

let copied = 0;
let overwritten = 0;

for (const entry of files) {
  const src = path.join(claudeSourceDir, entry.path);
  const dst = path.join(claudeTargetDir, entry.path);

  if (!fs.existsSync(src)) {
    console.warn(`  跳过（源文件不存在）：${entry.path}`);
    continue;
  }

  const existed = fs.existsSync(dst);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);

  if (existed) {
    overwritten++;
  } else {
    copied++;
  }
}

console.log(`✓ 同步完成 → ${path.join(targetDir, '.claude')}`);
console.log(`  新增 ${copied} 个，覆盖 ${overwritten} 个，共 ${files.length} 个文件`);
