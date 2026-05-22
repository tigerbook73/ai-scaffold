/**
 * Walkthrough state I/O helper.
 *
 * Usage:
 *   walkthrough-state.ts write  --branch <branch> --state '<json>'
 *   walkthrough-state.ts read   --branch <branch>
 *   walkthrough-state.ts delete --branch <branch>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { cac } from "cac"
import type { State, StateFile } from "./types"

const STATE_PATH = join(process.cwd(), ".ai-skills", "data", "walkthrough.json")

class WalkthroughState {
  private read(): StateFile {
    if (!existsSync(STATE_PATH)) return {}
    return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as StateFile
  }

  private write(data: StateFile): void {
    mkdirSync(join(process.cwd(), ".ai-skills", "data"), { recursive: true })
    writeFileSync(STATE_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8")
  }

  cmdWrite(branch: string, stateJson: string): void {
    const state: State = JSON.parse(stateJson)
    const data = this.read()
    data[branch] = state
    this.write(data)
  }

  cmdRead(branch: string): void {
    const data = this.read()
    if (!(branch in data)) {
      process.stderr.write(`No record for branch: ${branch}\n`)
      process.exit(1)
    }
    process.stdout.write(JSON.stringify(data[branch], null, 2) + "\n")
  }

  cmdDelete(branch: string): void {
    const data = this.read()
    delete data[branch]
    this.write(data)
  }

  run(): void {
    const cli = cac("walkthrough-state")

    cli
      .command("write", "Write or update state for a branch")
      .option("--branch <branch>", "Git branch name")
      .option("--state <json>", "State as a JSON string")
      .action((options: { branch: string; state: string }) => {
        this.cmdWrite(options.branch, options.state)
      })

    cli
      .command("read", "Read state for a branch")
      .option("--branch <branch>", "Git branch name")
      .action((options: { branch: string }) => {
        this.cmdRead(options.branch)
      })

    cli
      .command("delete", "Delete state for a branch")
      .option("--branch <branch>", "Git branch name")
      .action((options: { branch: string }) => {
        this.cmdDelete(options.branch)
      })

    cli.help()
    cli.parse()
  }
}

new WalkthroughState().run()
