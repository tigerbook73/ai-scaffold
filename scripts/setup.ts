import { lstatSync, rmSync, symlinkSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";
import { ClaudeSetup } from "./setup-claude";
import { CodexSetup } from "./setup-codex";

export function installSymlink(linkPath = join(homedir(), ".sk-skills")): void {
  const repoPath = resolve(__dirname, "..");
  try {
    lstatSync(linkPath);
    rmSync(linkPath, { recursive: true, force: true });
  } catch {}
  symlinkSync(repoPath, linkPath);
  console.log(`Symlink: ${linkPath} → ${repoPath}`);
}

if (require.main === module) {
  new ClaudeSetup().run();
  new CodexSetup().run();
  installSymlink();
}
