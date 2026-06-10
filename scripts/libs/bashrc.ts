import { existsSync, readFileSync, writeFileSync } from "fs";

export const AISK_BLOCK_START = "# AISK start";
export const AISK_BLOCK_END = "# AISK end";
export const AISK_PATH_LINE = 'export PATH="$HOME/.aisk/global:$PATH"';

const AISK_BLOCK = `${AISK_BLOCK_START}\n${AISK_PATH_LINE}\n${AISK_BLOCK_END}`;

/**
 * Appends the aisk block to bashrcPath with one blank line above and below.
 * No-op if the block is already present or the file does not exist.
 * Returns true if added.
 */
export function addPathToBashrc(bashrcPath: string): boolean {
  if (!existsSync(bashrcPath)) return false;
  const content = readFileSync(bashrcPath, "utf8");
  if (content.includes(AISK_BLOCK_START)) return false;
  const base = content.replace(/\n+$/, "");
  writeFileSync(bashrcPath, base + "\n\n" + AISK_BLOCK + "\n");
  return true;
}

/**
 * Removes the aisk block (start marker through end marker) from bashrcPath,
 * then collapses excess blank lines (3+ newlines → 2) and trims the file to a
 * single trailing newline.
 * No-op if the block is absent or the file does not exist.
 * Returns true if removed.
 */
export function removePathFromBashrc(bashrcPath: string): boolean {
  if (!existsSync(bashrcPath)) return false;
  const content = readFileSync(bashrcPath, "utf8");
  if (!content.includes(AISK_BLOCK_START)) return false;

  const lines = content.split("\n");
  const filtered: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (line.trimEnd() === AISK_BLOCK_START) {
      inBlock = true;
      continue;
    }
    if (line.trimEnd() === AISK_BLOCK_END) {
      inBlock = false;
      continue;
    }
    if (!inBlock) filtered.push(line);
  }

  const result = filtered
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+$/, "\n");

  writeFileSync(bashrcPath, result);
  return true;
}
