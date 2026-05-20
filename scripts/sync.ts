import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { homedir } from 'os'
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
  console.error('错误：~/.ai-skills/config.json 不存在，请先运行 npm run setup')
  process.exit(1)
}

const { repo } = JSON.parse(readFileSync(configFile, 'utf-8')) as { repo: string }
const settingFile = join(repo, 'claude', 'setting.json')

if (!existsSync(settingFile)) {
  console.error(`错误：${settingFile} 不存在，请先在仓库中运行 npm run build`)
  process.exit(1)
}

interface FileEntry { src: string; dst: string }
const { files } = JSON.parse(readFileSync(settingFile, 'utf-8')) as { files: FileEntry[] }

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
  console.log(`同步完成：新增 ${newCount}，覆盖 ${overwriteCount}`)
}
