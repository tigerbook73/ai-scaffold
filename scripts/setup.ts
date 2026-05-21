import { mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

class Setup {
  private repoPath: string
  private configDir: string
  private configFile: string
  private globalCmdsDir: string
  private metaSkills: string[]

  constructor() {
    this.repoPath = resolve(__dirname, '..')
    this.configDir = join(homedir(), '.ai-skills')
    this.configFile = join(this.configDir, 'config.json')
    this.globalCmdsDir = join(homedir(), '.claude', 'commands', 'aisk')
    this.metaSkills = ['sync.md', 'create-skill.md']
  }

  run(): void {
    mkdirSync(this.configDir, { recursive: true })
    mkdirSync(this.globalCmdsDir, { recursive: true })
    writeFileSync(this.configFile, JSON.stringify({ repo: this.repoPath }, null, 2) + '\n')

    for (const skill of this.metaSkills) {
      copyFileSync(join(this.repoPath, 'skills', skill), join(this.globalCmdsDir, skill))
    }

    console.log('Initialization complete:')
    console.log(`  Config: ${this.configFile}`)
    console.log(`  Repository: ${this.repoPath}`)
    console.log('  Installed global commands:')
    for (const skill of this.metaSkills) {
      console.log(`    ~/.claude/commands/aisk/${skill}`)
    }
  }
}

new Setup().run()
