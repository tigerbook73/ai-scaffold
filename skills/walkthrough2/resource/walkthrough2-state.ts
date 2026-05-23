/**
 * Walkthrough2 state I/O helper — manages index.json per state key.
 *
 * Usage:
 *   walkthrough2-state.ts init   --key <key> --index '<json>'
 *   walkthrough2-state.ts read   --key <key>
 *   walkthrough2-state.ts update --key <key> --index '<json>'
 *   walkthrough2-state.ts list
 *   walkthrough2-state.ts find   --hash <hash>
 *   walkthrough2-state.ts next   --key <key>
 *   walkthrough2-state.ts prev   --key <key>
 *   walkthrough2-state.ts goto   --key <key> --n <n>
 *   walkthrough2-state.ts finish --key <key>
 *   walkthrough2-state.ts delete --key <key>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "fs"
import { join } from "path"
import { cac } from "cac"
import type { Index } from "./types"

const BASE_DIR = join(process.cwd(), ".ai-skills", "walkthrough2")

class WalkthroughState {
  private stateDir(key: string): string {
    return join(BASE_DIR, key)
  }

  private indexPath(key: string): string {
    return join(this.stateDir(key), "index.json")
  }

  private readIndex(key: string): Index {
    return JSON.parse(readFileSync(this.indexPath(key), "utf-8")) as Index
  }

  cmdInit(key: string, indexJson: string): void {
    const dir = this.stateDir(key)
    mkdirSync(dir, { recursive: true })
    const index: Index = JSON.parse(indexJson)
    writeFileSync(this.indexPath(key), JSON.stringify(index, null, 2) + "\n", "utf-8")
  }

  cmdRead(key: string): void {
    const path = this.indexPath(key)
    if (!existsSync(path)) {
      console.error(`No state found for key: ${key}`)
      process.exit(1)
    }
    process.stdout.write(readFileSync(path, "utf-8"))
  }

  cmdUpdate(key: string, indexJson: string): void {
    const path = this.indexPath(key)
    if (!existsSync(path)) {
      console.error(`No state found for key: ${key}`)
      process.exit(1)
    }
    const index: Index = JSON.parse(indexJson)
    writeFileSync(path, JSON.stringify(index, null, 2) + "\n", "utf-8")
  }

  cmdList(): void {
    if (!existsSync(BASE_DIR)) {
      process.stdout.write("[]\n")
      return
    }
    const entries = readdirSync(BASE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const results = entries
      .filter((key) => existsSync(this.indexPath(key)))
      .map((key) => {
        const index = this.readIndex(key)
        return {
          key,
          status: index.status,
          target: index.target,
          currentGroup: index.currentGroup,
          totalGroups: index.totalGroups,
        }
      })

    process.stdout.write(JSON.stringify(results, null, 2) + "\n")
  }

  cmdFind(hash: string): void {
    if (!existsSync(BASE_DIR)) {
      console.error(`No active state found for hash: ${hash}`)
      process.exit(1)
    }
    const entries = readdirSync(BASE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    for (const key of entries) {
      if (!existsSync(this.indexPath(key))) continue
      const index = this.readIndex(key)
      if (index.targetHash === hash && index.status === "active") {
        process.stdout.write(JSON.stringify(index, null, 2) + "\n")
        return
      }
    }

    console.error(`No active state found for hash: ${hash}`)
    process.exit(1)
  }

  cmdNext(key: string): void {
    const index = this.readIndex(key)
    // currentGroup is 1-based; groups[] is 0-based
    index.groups[index.currentGroup - 1].done = true
    index.currentGroup += 1
    writeFileSync(this.indexPath(key), JSON.stringify(index, null, 2) + "\n", "utf-8")
    const nextFile = join(this.stateDir(key), `g${index.currentGroup}.md`)
    if (!existsSync(nextFile)) {
      console.error(`No next group: g${index.currentGroup}.md not found`)
      process.exit(1)
    }
    // Callers pipe this output directly as the next group's instruction text
    process.stdout.write(readFileSync(nextFile, "utf-8"))
  }

  cmdPrev(key: string): void {
    const index = this.readIndex(key)
    if (index.currentGroup <= 1) {
      console.error("Already at first group")
      process.exit(1)
    }
    index.currentGroup -= 1
    // currentGroup is 1-based; groups[] is 0-based — reset target group to not-done
    index.groups[index.currentGroup - 1].done = false
    writeFileSync(this.indexPath(key), JSON.stringify(index, null, 2) + "\n", "utf-8")
    const groupFile = join(this.stateDir(key), `g${index.currentGroup}.md`)
    if (!existsSync(groupFile)) {
      console.error(`Group file g${index.currentGroup}.md not found`)
      process.exit(1)
    }
    process.stdout.write(readFileSync(groupFile, "utf-8"))
  }

  cmdGoto(key: string, n: number): void {
    const index = this.readIndex(key)
    if (n < 1 || n > index.totalGroups) {
      console.error(`Group ${n} out of range (1..${index.totalGroups})`)
      process.exit(1)
    }
    index.currentGroup = n
    // Reset target group to not-done regardless of direction
    index.groups[n - 1].done = false
    writeFileSync(this.indexPath(key), JSON.stringify(index, null, 2) + "\n", "utf-8")
    const groupFile = join(this.stateDir(key), `g${n}.md`)
    if (!existsSync(groupFile)) {
      console.error(`Group file g${n}.md not found`)
      process.exit(1)
    }
    process.stdout.write(readFileSync(groupFile, "utf-8"))
  }

  cmdFinish(key: string): void {
    const index = this.readIndex(key)
    index.status = "completed"
    writeFileSync(this.indexPath(key), JSON.stringify(index, null, 2) + "\n", "utf-8")
    process.stdout.write(JSON.stringify({ status: "completed", stateKey: key }, null, 2) + "\n")
  }

  cmdDelete(key: string): void {
    const dir = this.stateDir(key)
    if (!existsSync(dir)) {
      console.error(`No state found for key: ${key}`)
      process.exit(1)
    }
    rmSync(dir, { recursive: true, force: true })
  }

  run(): void {
    const cli = cac("walkthrough2-state")

    cli
      .command("init", "Initialize state directory and write index.json")
      .option("--key <key>", "State key (sanitized branch name)")
      .option("--index <json>", "Index as a JSON string")
      .action((options: { key: string; index: string }) => {
        this.cmdInit(options.key, options.index)
      })

    cli
      .command("read", "Print index.json for a key to stdout")
      .option("--key <key>", "State key")
      .action((options: { key: string }) => {
        this.cmdRead(options.key)
      })

    cli
      .command("update", "Overwrite index.json for a key with new JSON")
      .option("--key <key>", "State key")
      .option("--index <json>", "Replacement index as a JSON string")
      .action((options: { key: string; index: string }) => {
        this.cmdUpdate(options.key, options.index)
      })

    cli.command("list", "List all walkthrough states with their status summary").action(() => {
      this.cmdList()
    })

    cli
      .command("find", "Find an active state by target commit hash; exits 1 if not found")
      .option("--hash <hash>", "Commit hash to search for")
      .action((options: { hash: string }) => {
        this.cmdFind(options.hash)
      })

    cli
      .command("next", "Mark current group done and print next group file to stdout")
      .option("--key <key>", "State key")
      .action((options: { key: string }) => {
        this.cmdNext(options.key)
      })

    cli
      .command("prev", "Go back to the previous group and print it to stdout")
      .option("--key <key>", "State key")
      .action((options: { key: string }) => {
        this.cmdPrev(options.key)
      })

    cli
      .command("goto", "Jump to group N and print it to stdout")
      .option("--key <key>", "State key")
      .option("--n <n>", "Target group number (1-based)")
      .action((options: { key: string; n: string }) => {
        this.cmdGoto(options.key, Number(options.n))
      })

    cli
      .command("finish", "Mark walkthrough as completed (does not delete state)")
      .option("--key <key>", "State key")
      .action((options: { key: string }) => {
        this.cmdFinish(options.key)
      })

    cli
      .command("delete", "Delete the entire state directory for a key")
      .option("--key <key>", "State key")
      .action((options: { key: string }) => {
        this.cmdDelete(options.key)
      })

    cli.help()

    if (process.argv.slice(2).length === 0) {
      cli.outputHelp()
      process.exit(0)
    }

    cli.parse()
  }
}

new WalkthroughState().run()
