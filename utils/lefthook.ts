import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Registers a pre-commit hook command in lefthook.yml (idempotent).
 *
 * - Creates lefthook.yml if absent.
 * - Only matches uncommented `pre-commit:` lines to avoid touching commented-out sections.
 * - Scopes `commands:` lookup to the pre-commit block to avoid cross-section pollution.
 */
export function registerPreCommitHook(
  projectDir: string,
  commandName: string,
  runCommand: string,
): void {
  const lefthookPath = join(projectDir, "lefthook.yml");
  const commandEntry = `    ${commandName}:\n      run: ${runCommand}`;

  if (!existsSync(lefthookPath)) {
    writeFileSync(lefthookPath, `pre-commit:\n  commands:\n${commandEntry}\n`);
    return;
  }

  let content = readFileSync(lefthookPath, "utf8");
  if (content.includes(`    ${commandName}:`)) return; // idempotent

  const preCommitMatch = /^pre-commit:/m.exec(content);
  if (!preCommitMatch) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    content += `${suffix}\npre-commit:\n  commands:\n${commandEntry}\n`;
    writeFileSync(lefthookPath, content);
    return;
  }

  const before = content.slice(0, preCommitMatch.index);
  const section = content.slice(preCommitMatch.index);

  const updated = /^  commands:/m.test(section)
    ? section.replace(/^(  commands:)/m, `$1\n${commandEntry}`)
    : section.replace(/^pre-commit:/m, `pre-commit:\n  commands:\n${commandEntry}`);

  writeFileSync(lefthookPath, before + updated);
}
