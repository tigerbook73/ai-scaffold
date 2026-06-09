import type { CustomBlock } from "../types/installer-types";

const CUSTOM_START_RE =
  /^(#|<!--)\s*AISK:CUSTOM\s+name="([^"]+)"\s+status="([^"]+)"\s+hint="([^"]*)".*$/;
const CUSTOM_END_HASH_RE = /^#\s*AISK:CUSTOM:END/;
const CUSTOM_END_HTML_RE = /^<!--\s*AISK:CUSTOM:END/;

/**
 * Parse all AISK:CUSTOM blocks from file content.
 *
 * Supports both Markdown hash comments and HTML comments because rules/skills
 * may need different comment syntaxes depending on where the template appears.
 */
export function parseCustomBlocks(content: string): CustomBlock[] {
  const lines = content.split("\n");
  const blocks: CustomBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const m = CUSTOM_START_RE.exec(lines[i]);
    if (m) {
      const commentStyle = m[1] as "#" | "<!--";
      const name = m[2];
      const status = m[3] as "todo" | "done";
      const hint = m[4];
      const startLine = i;
      const endRe = commentStyle === "#" ? CUSTOM_END_HASH_RE : CUSTOM_END_HTML_RE;

      const contentLines: string[] = [];
      i++;
      while (i < lines.length && !endRe.test(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }

      blocks.push({ name, status, hint, startLine, endLine: i, content: contentLines });
    }
    i++;
  }

  return blocks;
}

/**
 * Merge done blocks from oldContent into newTemplate, preserving new template hints.
 *
 * Only completed blocks are carried forward. TODO blocks deliberately keep the
 * new template body so updated instructions can reach the user before they fill
 * the customization region.
 */
export function mergeCustomContent(oldContent: string, newTemplate: string): string {
  const oldBlocks = parseCustomBlocks(oldContent);
  const doneMap = new Map<string, string[]>();
  for (const b of oldBlocks) {
    if (b.status === "done") doneMap.set(b.name, b.content);
  }

  if (doneMap.size === 0) return newTemplate;

  const lines = newTemplate.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const m = CUSTOM_START_RE.exec(lines[i]);
    if (m) {
      const commentStyle = m[1] as "#" | "<!--";
      const name = m[2];
      const endRe = commentStyle === "#" ? CUSTOM_END_HASH_RE : CUSTOM_END_HTML_RE;
      const doneContent = doneMap.get(name);
      const newStatus = doneContent ? "done" : "todo";

      // Rewrite only status so fresh template metadata such as hint/name stays authoritative.
      result.push(lines[i].replace(/status="[^"]+"/, `status="${newStatus}"`));

      if (doneContent) {
        // Replace template body with the user's completed content.
        i++;
        while (i < lines.length && !endRe.test(lines[i])) i++;
        result.push(...doneContent);
      } else {
        // Unfinished custom regions should receive any updated template guidance.
        i++;
        while (i < lines.length && !endRe.test(lines[i])) {
          result.push(lines[i]);
          i++;
        }
      }

      if (i < lines.length) result.push(lines[i]); // END line
    } else {
      result.push(lines[i]);
    }
    i++;
  }

  return result.join("\n");
}
