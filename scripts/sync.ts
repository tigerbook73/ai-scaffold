import { readFileSync, copyFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { homedir } from 'os'
import { createInterface } from 'readline'
import { cac } from 'cac'

const cli = cac('sync')
cli.option('--target <dir>', '目标项目目录（默认当前目录）')
cli.option('--dry-run', '预览变更，不实际写入')
cli.help()

const { options } = cli.parse()
const targetDir = resolve((options.target as string | undefined) ?? process.cwd())
const dryRun = !!(options.dryRun ?? options['dry-run'])

const configFile = join(homedir(), '.ai-skills', 'config.json')
if (!existsSync(configFile)) {
  console.error('错误：~/.ai-skills/config.json 不存在，请先运行 npm run register')
  process.exit(1)
}

const { repo } = JSON.parse(readFileSync(configFile, 'utf-8')) as { repo: string }

if (resolve(targetDir) === resolve(repo)) {
  console.error('错误：目标项目不能是技能库本身，请在其他项目中运行 /aisk/sync')
  process.exit(1)
}

const settingFile = join(repo, 'claude', 'setting.json')

if (!existsSync(settingFile)) {
  console.error(`错误：${settingFile} 不存在，请先在仓库中运行 npm run build`)
  process.exit(1)
}

interface FileEntry { src: string; dst: string }
const { files } = JSON.parse(readFileSync(settingFile, 'utf-8')) as { files: FileEntry[] }

const aiSkillsDir = join(targetDir, '.ai-skills')
const isFirstSync = !existsSync(aiSkillsDir)

let newCount = 0
let overwriteCount = 0

for (const { src, dst } of files) {
  const srcPath = join(repo, 'skills', src)
  const dstPath = join(targetDir, dst)

  if (!existsSync(srcPath)) {
    console.warn(`  跳过（源不存在）：${src}`)
    continue
  }

  const exists = existsSync(dstPath)
  if (dryRun) {
    console.log(`  ${exists ? '[覆盖]' : '[新增]'} ${dst}`)
  } else {
    mkdirSync(dirname(dstPath), { recursive: true })
    copyFileSync(srcPath, dstPath)
  }

  if (exists) overwriteCount++
  else newCount++
}

if (dryRun) {
  console.log(`\n[dry-run] 新增 ${newCount}，覆盖 ${overwriteCount}（未实际写入）`)
} else {
  if (isFirstSync) {
    const gitignorePath = join(targetDir, '.gitignore')
    if (process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      const answer = await new Promise<string>(resolve =>
        rl.question('\n将 .ai-skills/ 加入 .gitignore？[y/N] ', resolve)
      )
      rl.close()
      if (answer.toLowerCase() === 'y') {
        appendFileSync(gitignorePath, '\n.ai-skills/\n')
        console.log('.gitignore 已更新')
      }
    } else {
      console.log('\n提示：建议将 .ai-skills/ 加入 .gitignore')
    }
  }
  console.log(`同步完成：新增 ${newCount}，覆盖 ${overwriteCount}`)
}
