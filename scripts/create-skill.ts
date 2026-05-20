import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs'
import { join, basename, resolve } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { createInterface } from 'readline'
import { cac } from 'cac'

const cli = cac('create-skill')
cli.usage('<file> [options]')
cli.option('--name <name>', '技能名（目标文件名，不含 .md）')
cli.option('--description <desc>', '技能描述（覆盖文件首行标题）')
cli.option('--force', '跳过同名冲突确认')
cli.help()

const { args, options } = cli.parse()
const [file] = args

if (!file) {
  cli.outputHelp()
  process.exit(1)
}

const configFile = join(homedir(), '.ai-skills', 'config.json')
if (!existsSync(configFile)) {
  console.error('错误：~/.ai-skills/config.json 不存在，请先运行 npm run setup')
  process.exit(1)
}

const { repo } = JSON.parse(readFileSync(configFile, 'utf-8')) as { repo: string }
const srcPath = resolve(file)

if (!existsSync(srcPath)) {
  console.error(`错误：源文件不存在：${srcPath}`)
  process.exit(1)
}

const name: string = (options.name as string | undefined) ?? basename(srcPath, '.md')
const dstPath = join(repo, 'skills', `${name}.md`)

async function main() {
  if (existsSync(dstPath) && !options.force) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>(res => rl.question(`技能 ${name}.md 已存在，覆盖？(y/N) `, res))
    rl.close()
    if (answer.toLowerCase() !== 'y') {
      console.log('已取消')
      process.exit(0)
    }
  }

  copyFileSync(srcPath, dstPath)
  console.log(`技能已写入：${dstPath}`)

  execSync('npm run build', { cwd: repo, stdio: 'inherit' })

  // 若传了 --description，覆盖 build 生成的描述
  if (options.description) {
    const settingFile = join(repo, 'claude', 'setting.json')
    const setting = JSON.parse(readFileSync(settingFile, 'utf-8'))
    const entry = setting.files.find((f: { src: string }) => f.src === `${name}.md`)
    if (entry) {
      entry.description = options.description as string
      writeFileSync(settingFile, JSON.stringify(setting, null, 2) + '\n')
    }
  }

  console.log('\n执行 git commit 持久化，再用 /aisk/sync 分发到项目。')
}

main().catch(err => {
  console.error((err as Error).message)
  process.exit(1)
})
