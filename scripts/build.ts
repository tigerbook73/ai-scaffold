import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename, resolve } from 'path'

const repoRoot = resolve(__dirname, '..')
const skillsDir = join(repoRoot, 'skills')
const settingFile = join(repoRoot, 'claude', 'setting.json')

interface FileEntry {
  src: string
  dst: string
  description: string
  category: string
}

interface Setting {
  version: string
  files: FileEntry[]
}

function getFirstHeading(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : basename(filePath, '.md')
}

function inferCategory(relPath: string): string {
  const firstDir = relPath.split('/')[0]
  if (firstDir === 'arch') return 'arch'
  if (firstDir === 'task') return 'task'
  return 'meta'
}

function inferDst(relPath: string): string {
  if (relPath.includes('/resource/')) {
    return `.ai-skills/${relPath}`
  }
  return `.claude/commands/aisk/${basename(relPath)}`
}

function scan(dir: string, base = ''): string[] {
  const result: string[] = []
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry)
    const rel = base ? `${base}/${entry}` : entry
    if (statSync(full).isDirectory()) {
      result.push(...scan(full, rel))
    } else if (entry.endsWith('.md') && entry !== 'README.md') {
      result.push(rel)
    }
  }
  return result
}

const existing = new Map<string, FileEntry>()
if (existsSync(settingFile)) {
  const data: Setting = JSON.parse(readFileSync(settingFile, 'utf-8'))
  for (const f of data.files) existing.set(f.src, f)
}

const srcs = scan(skillsDir)
let added = 0, updated = 0, removed = 0

const files: FileEntry[] = srcs.map(src => {
  const ex = existing.get(src)
  if (ex) {
    updated++
    return {
      src,
      dst: inferDst(src),
      description: ex.description,
      category: inferCategory(src),
    }
  } else {
    added++
    return {
      src,
      dst: inferDst(src),
      description: getFirstHeading(join(skillsDir, src)),
      category: inferCategory(src),
    }
  }
})

for (const src of existing.keys()) {
  if (!srcs.includes(src)) removed++
}

writeFileSync(settingFile, JSON.stringify({ version: '1.0', files }, null, 2) + '\n')
console.log(`claude/setting.json updated: ${added} added, ${updated} updated, ${removed} removed`)
