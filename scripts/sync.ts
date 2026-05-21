import { readFileSync, copyFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { homedir } from 'os'
import { createInterface } from 'readline'
import { cac } from 'cac'

interface FileEntry { src: string; dst: string }

class Syncer {
  private targetDir: string
  private dryRun: boolean

  constructor() {
    const cli = cac('sync')
    cli.option('--target <dir>', 'Target project directory (defaults to current directory)')
    cli.option('--dry-run', 'Preview changes without writing')
    cli.help()

    const { options } = cli.parse()
    this.targetDir = resolve((options.target as string | undefined) ?? process.cwd())
    this.dryRun = !!(options.dryRun ?? options['dry-run'])
  }

  async run(): Promise<void> {
    const configFile = join(homedir(), '.ai-skills', 'config.json')
    if (!existsSync(configFile)) {
      console.error('Error: ~/.ai-skills/config.json not found. Run npm run register first.')
      process.exit(1)
    }

    const { repo } = JSON.parse(readFileSync(configFile, 'utf-8')) as { repo: string }

    const settingFile = join(repo, 'claude', 'setting.json')
    if (!existsSync(settingFile)) {
      console.error(`Error: ${settingFile} not found. Run npm run build in the repository first.`)
      process.exit(1)
    }

    const { files } = JSON.parse(readFileSync(settingFile, 'utf-8')) as { files: FileEntry[] }

    const aiSkillsDir = join(this.targetDir, '.ai-skills')
    const isFirstSync = !existsSync(aiSkillsDir)

    let newCount = 0
    let overwriteCount = 0

    for (const { src, dst } of files) {
      const srcPath = join(repo, 'skills', src)
      const dstPath = join(this.targetDir, dst)

      if (!existsSync(srcPath)) {
        console.warn(`  Skipped (source not found): ${src}`)
        continue
      }

      const exists = existsSync(dstPath)
      if (this.dryRun) {
        console.log(`  ${exists ? '[overwrite]' : '[new]'} ${dst}`)
      } else {
        mkdirSync(dirname(dstPath), { recursive: true })
        copyFileSync(srcPath, dstPath)
      }

      if (exists) overwriteCount++
      else newCount++
    }

    if (this.dryRun) {
      console.log(`\n[dry-run] ${newCount} new, ${overwriteCount} overwrite (nothing written)`)
    } else {
      if (isFirstSync) {
        const gitignorePath = join(this.targetDir, '.gitignore')
        if (process.stdin.isTTY) {
          const rl = createInterface({ input: process.stdin, output: process.stdout })
          const answer = await new Promise<string>(resolve =>
            rl.question('\nAdd .ai-skills/ to .gitignore? [y/N] ', resolve)
          )
          rl.close()
          if (answer.toLowerCase() === 'y') {
            appendFileSync(gitignorePath, '\n.ai-skills/\n')
            console.log('.gitignore updated')
          }
        } else {
          console.log('\nNote: consider adding .ai-skills/ to .gitignore')
        }
      }
      console.log(`Sync complete: ${newCount} new, ${overwriteCount} overwritten`)
    }
  }
}

new Syncer().run().catch(err => {
  console.error((err as Error).message)
  process.exit(1)
})
