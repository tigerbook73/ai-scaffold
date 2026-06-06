#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

if (process.argv.includes("--dry-run")) {
  process.stdout.write("poc-hook: dry-run OK\n");
  process.exit(0);
}

const logDir = join(process.cwd(), ".aisf", "poc-unit");
const logFile = join(logDir, "hook-log.txt");

mkdirSync(logDir, { recursive: true });
appendFileSync(logFile, `${new Date().toISOString()}\n`);
process.stdout.write(`poc-hook: logged timestamp to ${logFile}\n`);
