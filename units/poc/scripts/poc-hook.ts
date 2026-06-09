#!/usr/bin/env node
/**
 * Small hook used by the poc unit to prove script publishing and hook execution.
 *
 * It records the files passed by lefthook into project-local .aisk state; the
 * behavior is intentionally simple so installer tests can assert the full path
 * from unit script source to installed runnable hook.
 */
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);

if (args.includes("--dry-run")) {
  process.stdout.write("poc-hook: dry-run OK\n");
  process.exit(0);
}

const stagedFiles = args.filter((a) => !a.startsWith("--"));

const logDir = join(process.cwd(), ".aisk", "poc-unit");
const logFile = join(logDir, "hook-log.txt");

mkdirSync(logDir, { recursive: true });
const entry = `${new Date().toISOString()} files=${stagedFiles.join(",") || "(none)"}\n`;
appendFileSync(logFile, entry);
process.stdout.write(`poc-hook: ${entry.trim()}\n`);
