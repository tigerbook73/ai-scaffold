import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs"
import { join, basename, resolve } from "path"

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

class Builder {
  private repoRoot: string
  private skillsDir: string
  private settingFile: string

  constructor() {
    this.repoRoot = resolve(__dirname, "..")
    this.skillsDir = join(this.repoRoot, "skills")
    this.settingFile = join(this.repoRoot, "claude", "setting.json")
  }

  private getFirstHeading(filePath: string): string {
    const content = readFileSync(filePath, "utf-8")
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1].trim() : basename(filePath, ".md")
  }

  private inferCategory(relPath: string): string {
    return relPath.split("/")[0]
  }

  private inferDst(relPath: string): string {
    if (relPath.split("/").includes("resource")) {
      return `.ai-skills/${relPath}`
    }
    return `.claude/commands/aisk/${basename(relPath)}`
  }

  private scan(dir: string, base = ""): string[] {
    const result: string[] = []
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry)
      const rel = base ? `${base}/${entry}` : entry
      if (statSync(full).isDirectory()) {
        result.push(...this.scan(full, rel))
      } else if (entry.endsWith(".md") && entry !== "README.md") {
        result.push(rel)
      }
    }
    return result
  }

  run(): void {
    const existing = new Map<string, FileEntry>()
    if (existsSync(this.settingFile)) {
      const data: Setting = JSON.parse(readFileSync(this.settingFile, "utf-8"))
      for (const f of data.files) existing.set(f.src, f)
    }

    const srcs = this.scan(this.skillsDir)
    let added = 0,
      updated = 0,
      removed = 0

    const files: FileEntry[] = srcs
      .filter((src) => !src.split("/").includes("resource"))
      .map((src) => {
        const ex = existing.get(src)
        if (ex) {
          updated++
          return {
            src,
            dst: this.inferDst(src),
            description: ex.description,
            category: this.inferCategory(src),
          }
        } else {
          added++
          return {
            src,
            dst: this.inferDst(src),
            description: this.getFirstHeading(join(this.skillsDir, src)),
            category: this.inferCategory(src),
          }
        }
      })

    for (const src of existing.keys()) {
      if (!srcs.includes(src)) removed++
    }

    writeFileSync(this.settingFile, JSON.stringify({ version: "1.0", files }, null, 2) + "\n")
    console.log(
      `claude/setting.json updated: ${added} added, ${updated} updated, ${removed} removed`,
    )
  }
}

new Builder().run()
