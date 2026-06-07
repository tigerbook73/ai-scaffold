import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Returns the [start, end) line-index range of the pre-commit section.
 * `end` is the index of the first line that belongs to the next top-level section
 * (non-indented, non-empty), or lines.length if pre-commit is the last section.
 */
function getPreCommitBounds(lines: string[]): { start: number; end: number } | null {
  const start = lines.findIndex((l) => /^pre-commit:/.test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && (lines[end].startsWith(" ") || lines[end] === "")) {
    end++;
  }
  return { start, end };
}

/**
 * Adds a pre-commit hook command entry to lefthook.yml (idempotent).
 *
 * - Creates lefthook.yml if absent.
 * - Only matches uncommented `pre-commit:` lines to avoid touching commented-out sections.
 * - Scopes all lookups to the pre-commit section to avoid cross-section pollution.
 */
export function addPreCommitHook(
  projectDir: string,
  commandName: string,
  runCommand: string,
): void {
  const lefthookPath = join(projectDir, "lefthook.yml");
  const commandLines = [`    ${commandName}:`, `      run: ${runCommand}`];

  if (!existsSync(lefthookPath)) {
    writeFileSync(lefthookPath, `pre-commit:\n  commands:\n${commandLines.join("\n")}\n`);
    return;
  }

  const content = readFileSync(lefthookPath, "utf8");
  const lines = content.split("\n");
  const bounds = getPreCommitBounds(lines);

  if (!bounds) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(lefthookPath, `${content}${suffix}\npre-commit:\n  commands:\n${commandLines.join("\n")}\n`);
    return;
  }

  const section = lines.slice(bounds.start, bounds.end);

  // Idempotency: scoped to pre-commit section only
  if (section.some((l) => l === `    ${commandName}:`)) return;

  const commandsRelIdx = section.findIndex((l) => /^  commands:/.test(l));
  if (commandsRelIdx === -1) {
    // No commands block yet: insert one after `pre-commit:`
    lines.splice(bounds.start + 1, 0, "  commands:", ...commandLines);
  } else {
    // Insert after `  commands:` line
    lines.splice(bounds.start + commandsRelIdx + 1, 0, ...commandLines);
  }

  writeFileSync(lefthookPath, lines.join("\n"));
}

/**
 * Removes a pre-commit hook command entry from lefthook.yml.
 * No-op if the file, the pre-commit section, or the command does not exist.
 */
export function removePreCommitHook(projectDir: string, commandName: string): void {
  const lefthookPath = join(projectDir, "lefthook.yml");
  if (!existsSync(lefthookPath)) return;

  const lines = readFileSync(lefthookPath, "utf8").split("\n");
  const bounds = getPreCommitBounds(lines);
  if (!bounds) return;

  const commandLine = `    ${commandName}:`;
  const relIdx = lines.slice(bounds.start, bounds.end).findIndex((l) => l === commandLine);
  if (relIdx === -1) return;

  const startIdx = bounds.start + relIdx;
  let endIdx = startIdx + 1;
  while (endIdx < bounds.end && lines[endIdx].startsWith("      ")) {
    endIdx++;
  }

  lines.splice(startIdx, endIdx - startIdx);
  writeFileSync(lefthookPath, lines.join("\n"));
}

/**
 * Updates the `run:` value for an existing pre-commit hook entry.
 * Only modifies the `run:` line; all other content is preserved.
 * No-op if the file, the pre-commit section, or the command does not exist.
 */
export function updatePreCommitHook(
  projectDir: string,
  commandName: string,
  runCommand: string,
): void {
  const lefthookPath = join(projectDir, "lefthook.yml");
  if (!existsSync(lefthookPath)) return;

  const lines = readFileSync(lefthookPath, "utf8").split("\n");
  const bounds = getPreCommitBounds(lines);
  if (!bounds) return;

  const commandLine = `    ${commandName}:`;
  const relIdx = lines.slice(bounds.start, bounds.end).findIndex((l) => l === commandLine);
  if (relIdx === -1) return;

  const startIdx = bounds.start + relIdx;
  for (let i = startIdx + 1; i < bounds.end; i++) {
    if (!lines[i].startsWith("      ")) break;
    if (/^      run:/.test(lines[i])) {
      lines[i] = `      run: ${runCommand}`;
      writeFileSync(lefthookPath, lines.join("\n"));
      return;
    }
  }
}
