#!/usr/bin/env bun
import { resolve } from "path";
import { cac } from "cac";
import { Installer } from "../global/installer";

/** Package root — used as aiskHome so Installer reads units directly from the linked/installed package. */
const pkgRoot = resolve(__dirname, "..");

function installer(json: boolean): Installer {
  return new Installer(process.cwd(), pkgRoot, json);
}

const cli = cac("aisk-setup");

cli.option("--json", "Output JSON instead of the default human-readable text");

// ─── Local units (project-scoped) ──────────────────────────────────────────────
// Global units (machine-wide, no project scoping) are managed separately via
// the `aisk-register` command (bin/aisk-register.ts), not this CLI.

cli
  .command("init [...units]", "Install local units into the current project")
  .example("  aisk-setup init test-review-gate")
  .example("  aisk-setup init test-review-gate ui-coverage")
  .example("  aisk-setup init all")
  .action((units: string[], options: { json?: boolean }) => installer(!!options.json).init(units));

cli
  .command("remove [...units]", "Remove installed local units from the current project")
  .example("  aisk-setup remove test-review-gate")
  .action((units: string[], options: { json?: boolean }) =>
    installer(!!options.json).remove(units),
  );

cli
  .command("update [...units]", "Update installed local units (all if none specified)")
  .example("  aisk-setup update")
  .example("  aisk-setup update test-review-gate")
  .action((units: string[], options: { json?: boolean }) =>
    installer(!!options.json).update(units.length ? units : ["all"]),
  );

// ─── Read-only, dual scope (global + local) ────────────────────────────────────

cli
  .command("list", "List all units (global + local) and their status")
  .option("--scope <scope>", "Filter: global | local | all", { default: "all" })
  .action((options: { json?: boolean; scope?: "global" | "local" | "all" }) =>
    installer(!!options.json).list(options.scope ?? "all"),
  );

cli
  .command("show <unit>", "Show details for a unit")
  .example("  aisk-setup show staged-plan")
  .action((unit: string, options: { json?: boolean }) => installer(!!options.json).show(unit));

cli
  .command("refresh", "Sync local customStatus from disk, output TODO list, clean orphaned hooks")
  .option("--silent", "Suppress output (used for internal pre-operation refresh)")
  .action((options: { silent?: boolean; json?: boolean }) =>
    installer(!!options.json).refresh(options.silent ?? false),
  );

cli.help();
cli.parse();
