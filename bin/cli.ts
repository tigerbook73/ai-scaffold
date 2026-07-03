#!/usr/bin/env bun
import { resolve } from "path";
import { cac } from "cac";
import { Installer } from "../global/scripts/installer";

/** Package root — used as aiskHome so Installer reads units directly from the linked/installed package. */
const pkgRoot = resolve(__dirname, "..");

function installer(human: boolean): Installer {
  return new Installer(process.cwd(), pkgRoot, human);
}

const cli = cac("ai-skills");

cli.option("--human", "Output in human-readable text format instead of JSON");

cli
  .command("install [...units]", "Install units into the current project")
  .alias("add")
  .example("  ai-skills install quick-ship")
  .example("  ai-skills install quick-ship staged-plan")
  .example("  ai-skills install all")
  .action((units: string[], options: { human?: boolean }) => installer(!!options.human).add(units));

cli
  .command("remove [...units]", "Remove installed units from the current project")
  .example("  ai-skills remove quick-ship")
  .action((units: string[], options: { human?: boolean }) =>
    installer(!!options.human).remove(units),
  );

cli
  .command("update [...units]", "Update installed units (all if none specified)")
  .example("  ai-skills update")
  .example("  ai-skills update quick-ship")
  .action((units: string[], options: { human?: boolean }) =>
    installer(!!options.human).update(units.length ? units : ["all"]),
  );

cli
  .command("list", "List available units and their install status")
  .action((options: { human?: boolean }) => installer(!!options.human).list());

cli
  .command("show <unit>", "Show details for a unit")
  .example("  ai-skills show staged-plan")
  .action((unit: string, options: { human?: boolean }) => installer(!!options.human).show(unit));

cli
  .command("refresh", "Sync customStatus from disk, output TODO list, clean orphaned hooks")
  .option("--silent", "Suppress output (used for internal pre-operation refresh)")
  .action((options: { silent?: boolean; human?: boolean }) =>
    installer(!!options.human).refresh(options.silent ?? false),
  );

cli
  .command("sync-global", "Symlink aisk-setup and all enabled units' skills into ~/.claude/skills")
  .action((options: { human?: boolean }) => installer(!!options.human).syncGlobal());

cli.help();
cli.parse();
