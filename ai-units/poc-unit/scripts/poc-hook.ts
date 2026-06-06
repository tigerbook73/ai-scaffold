#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);

if (args.includes("--dry-run")) {
  process.stdout.write("poc-hook: dry-run OK\n");
  process.exit(0);
}

const stagedFiles = args.filter((a) => !a.startsWith("--"));

const logDir = join(process.cwd(), ".aisf", "poc-unit");
const logFile = join(logDir, "hook-log.txt");

mkdirSync(logDir, { recursive: true });
const entry = `${new Date().toISOString()} files=${stagedFiles.join(",") || "(none)"}\n`;
appendFileSync(logFile, entry);
process.stdout.write(`poc-hook: ${entry.trim()}\n`);
