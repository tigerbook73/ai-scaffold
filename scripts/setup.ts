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

console.log('Initialization complete:')
console.log(`  Config: ${configFile}`)
console.log(`  Repository: ${repoPath}`)
console.log('  Installed global commands:')
for (const skill of META_SKILLS) {
  console.log(`    ~/.claude/commands/aisk/${skill}`)
}
