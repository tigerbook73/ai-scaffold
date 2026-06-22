#!/usr/bin/env node
import { resolve } from "path";
import { cac } from "cac";
import { Installer } from "../global/scripts/installer";

/** Package root — used as aiskHome so Installer reads units from node_modules/ai-skills/. */
const pkgRoot = resolve(__dirname, "..");

function installer(): Installer {
  return new Installer(process.cwd(), pkgRoot, true);
}

const cli = cac("ai-skills");

cli
  .command("install [...units]", "Install units into the current project")
  .example("  ai-skills install quick-ship")
  .example("  ai-skills install quick-ship staged-plan")
  .example("  ai-skills install all")
  .action((units: string[]) => installer().add(units));

cli
  .command("remove [...units]", "Remove installed units from the current project")
  .example("  ai-skills remove quick-ship")
  .action((units: string[]) => installer().remove(units));

cli
  .command("update [...units]", "Update installed units (all if none specified)")
  .example("  ai-skills update")
  .example("  ai-skills update quick-ship")
  .action((units: string[]) => installer().update(units.length ? units : ["all"]));

cli
  .command("list", "List available units and their install status")
  .action(() => installer().list());

cli
  .command("show <unit>", "Show details for a unit")
  .example("  ai-skills show staged-plan")
  .action((unit: string) => installer().show(unit));

cli.help();
cli.parse();
