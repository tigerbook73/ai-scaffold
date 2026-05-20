#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const repoPath = path.resolve(__dirname, '..');
const configDir = path.join(os.homedir(), '.ai-skills');
const configFile = path.join(configDir, 'config.json');
const globalCommandsDir = path.join(os.homedir(), '.claude', 'commands');

const META_COMMANDS = ['sync.md', 'create-skill.md'];

fs.mkdirSync(configDir, { recursive: true });
fs.mkdirSync(globalCommandsDir, { recursive: true });

fs.writeFileSync(configFile, JSON.stringify({ repo: repoPath }, null, 2) + '\n');

const installed = [];
for (const file of META_COMMANDS) {
  const src = path.join(repoPath, 'claude', 'commands', file);
  const dst = path.join(globalCommandsDir, file);
  fs.copyFileSync(src, dst);
  installed.push(dst);
}

console.log(`✓ 配置已写入：${configFile}`);
console.log(`  repo: ${repoPath}`);
console.log('');
console.log('✓ 元命令已安装到全局：');
for (const f of installed) {
  console.log(`  ${f}`);
}
console.log('');
console.log('现在可以在任意项目中使用 /sync 同步技能。');
