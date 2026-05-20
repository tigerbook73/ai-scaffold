import { mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

const repoPath = resolve(__dirname, '..')
const configDir = join(homedir(), '.ai-skills')
const configFile = join(configDir, 'config.json')
const globalCmdsDir = join(homedir(), '.claude', 'commands', 'aisk')
const META_SKILLS = ['sync.md', 'create-skill.md']

mkdirSync(configDir, { recursive: true })
mkdirSync(globalCmdsDir, { recursive: true })
writeFileSync(configFile, JSON.stringify({ repo: repoPath }, null, 2) + '\n')

for (const skill of META_SKILLS) {
  copyFileSync(join(repoPath, 'skills', skill), join(globalCmdsDir, skill))
}

console.log('初始化完成：')
console.log(`  配置：${configFile}`)
console.log(`  仓库：${repoPath}`)
console.log('  已安装全局命令：')
for (const skill of META_SKILLS) {
  console.log(`    ~/.claude/commands/aisk/${skill}`)
}
