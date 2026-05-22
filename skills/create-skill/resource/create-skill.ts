import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, basename, resolve, dirname } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { createInterface } from 'readline'
import { cac } from 'cac'

interface Options {
  name?: string
  description?: string
  cleanup?: boolean
  force?: boolean
}

class SkillCreator {
  private async confirm(question: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>(res => rl.question(question, res))
    rl.close()
    return answer.toLowerCase() === 'y'
  }

  run(): void {
    const cli = cac('create-skill')

    cli
      .command('[file]', 'Promote a skill file to the global repository')
      .option('--name <name>', 'Skill name (target filename without .md)')
      .option('--description <desc>', 'Skill description (overrides the first-line heading)')
      .option('--cleanup', 'Delete the source file after copying (use when source is a temp file)')
      .option('--force', 'Skip all confirmation prompts (source-in-repo and overwrite)')
      .action(async (file: string | undefined, options: Options) => {
        try {
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
          const srcPath = resolve(file)

          if (!existsSync(srcPath)) {
            console.error(`Error: Source file not found: ${srcPath}`)
            process.exit(1)
          }

          const srcInRepo = srcPath.startsWith(join(repo, 'skills'))
          const name = options.name ?? basename(srcPath, '.md')
          const dstPath = join(repo, 'skills', name, `${name}.md`)

          if (srcInRepo && !options.force) {
            const ok = await this.confirm(`Source file is already in the repository. Update ${name}? (y/N) `)
            if (!ok) { console.log('Cancelled'); process.exit(0) }
          }

          if (existsSync(dstPath) && !options.force) {
            const ok = await this.confirm(`Skill ${name}.md already exists. Overwrite? (y/N) `)
            if (!ok) { console.log('Cancelled'); process.exit(0) }
          }

          mkdirSync(dirname(dstPath), { recursive: true })
          copyFileSync(srcPath, dstPath)
          if (options.cleanup) unlinkSync(srcPath)
          console.log(`Skill written to: ${dstPath}`)

          execSync('npm run build', { cwd: repo, stdio: 'inherit' })

          if (options.description) {
            const settingFile = join(repo, 'claude', 'setting.json')
            const setting = JSON.parse(readFileSync(settingFile, 'utf-8'))
            const entry = setting.files.find((f: { src: string }) => f.src === `${name}/${name}.md`)
            if (entry) {
              entry.description = options.description
              writeFileSync(settingFile, JSON.stringify(setting, null, 2) + '\n')
            }
          }

          console.log('\nRun git commit to persist, then use /aisk/sync to distribute to projects.')
        } catch (err) {
          console.error((err as Error).message)
          process.exit(1)
        }
      })

    cli.help()
    cli.parse()
  }
}

new SkillCreator().run()
