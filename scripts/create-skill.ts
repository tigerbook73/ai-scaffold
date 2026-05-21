import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs'
import { join, basename, resolve } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { createInterface } from 'readline'
import { cac } from 'cac'

class SkillCreator {
  private file: string
  private name: string
  private dstPath: string
  private repo: string
  private options: Record<string, unknown>

  constructor() {
    const cli = cac('create-skill')
    cli.usage('<file> [options]')
    cli.option('--name <name>', 'Skill name (target filename without .md)')
    cli.option('--description <desc>', 'Skill description (overrides the first-line heading)')
    cli.option('--force', 'Skip conflict confirmation for duplicate names')
    cli.help()

    const { args, options } = cli.parse()
    this.options = options as Record<string, unknown>
    const [file] = args

    if (!file) {
      cli.outputHelp()
      process.exit(0)
    }

    const configFile = join(homedir(), '.ai-skills', 'config.json')
    if (!existsSync(configFile)) {
      console.error('Error: ~/.ai-skills/config.json not found. Run npm run register first.')
      process.exit(1)
    }

    const { repo } = JSON.parse(readFileSync(configFile, 'utf-8')) as { repo: string }
    this.repo = repo

    const srcPath = resolve(file)
    if (srcPath.startsWith(join(repo, 'skills'))) {
      console.error('Error: Source file is already in the skill repository; no need to add it again.')
      process.exit(1)
    }

    if (!existsSync(srcPath)) {
      console.error(`Error: Source file not found: ${srcPath}`)
      process.exit(1)
    }

    this.file = srcPath
    this.name = (options.name as string | undefined) ?? basename(srcPath, '.md')
    this.dstPath = join(repo, 'skills', `${this.name}.md`)
  }

  async run(): Promise<void> {
    if (existsSync(this.dstPath) && !this.options.force) {
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      const answer = await new Promise<string>(res =>
        rl.question(`Skill ${this.name}.md already exists. Overwrite? (y/N) `, res)
      )
      rl.close()
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled')
        process.exit(0)
      }
    }

    copyFileSync(this.file, this.dstPath)
    console.log(`Skill written to: ${this.dstPath}`)

    execSync('npm run build', { cwd: this.repo, stdio: 'inherit' })

    if (this.options.description) {
      const settingFile = join(this.repo, 'claude', 'setting.json')
      const setting = JSON.parse(readFileSync(settingFile, 'utf-8'))
      const entry = setting.files.find((f: { src: string }) => f.src === `${this.name}.md`)
      if (entry) {
        entry.description = this.options.description as string
        writeFileSync(settingFile, JSON.stringify(setting, null, 2) + '\n')
      }
    }

    console.log('\nRun git commit to persist, then use /aisk/sync to distribute to projects.')
  }
}

new SkillCreator().run().catch(err => {
  console.error((err as Error).message)
  process.exit(1)
})
