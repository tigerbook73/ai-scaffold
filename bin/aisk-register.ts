#!/usr/bin/env bun
/**
 * Registers/unregisters global units' skills into ~/.claude/skills.
 *
 * Global command (bun-linked/installed as `aisk-register`): `aisk-register register|unregister`.
 * Global units are machine-wide and don't belong to any target project — there's
 * no `cwd` here, only aiskHome (this repo) and globalSkillsDir (~/.claude/skills).
 * Local units (init/update/remove) stay in global/installer.ts, behind `aisk-setup`.
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";
import {
  globalDirName,
  isLocalUnit,
  readRegistry,
  readUnitJson,
  REGISTRY_FILENAME,
} from "../global/libs/global-units";
import type {
  RegisterResult,
  RegistryEntry,
  UnregisterResult,
} from "../global/types/installer-types";

/** Create/replace a symlink at dest pointing to src. No-op if already correct. */
function ensureSymlink(src: string, dest: string): void {
  let existingType: "symlink" | "other" | "none" = "none";
  try {
    existingType = lstatSync(dest).isSymbolicLink() ? "symlink" : "other";
  } catch {
    existingType = "none";
  }

  if (existingType === "symlink") {
    if (readlinkSync(dest) === src) return;
    rmSync(dest);
  } else if (existingType === "other") {
    // Everything under a registered aisk-* directory is owned by register().
    rmSync(dest, { recursive: true, force: true });
  }

  mkdirSync(dirname(dest), { recursive: true });
  symlinkSync(src, dest);
}

/** Remove dest if it is a symlink (used to prune components a unit no longer declares). */
function removeIfSymlink(dest: string): void {
  try {
    if (lstatSync(dest).isSymbolicLink()) rmSync(dest);
  } catch {
    /* doesn't exist */
  }
}

/** Remove every directory the given registry entries point at. Idempotent (missing dirs are a no-op). */
function unregisterEntries(entries: RegistryEntry[]): RegistryEntry[] {
  for (const e of entries) {
    rmSync(e.dir, { recursive: true, force: true });
  }
  return entries;
}

/** Persist the registration record. */
function writeRegistry(globalSkillsDir: string, entries: RegistryEntry[]): void {
  mkdirSync(globalSkillsDir, { recursive: true });
  writeFileSync(
    join(globalSkillsDir, REGISTRY_FILENAME),
    JSON.stringify({ registeredAt: new Date().toISOString(), entries }, null, 2) + "\n",
  );
}

/**
 * Rebuild everything under globalSkillsDir: unregister whatever the previous
 * registration record listed, then symlink every global unit's skill (+
 * resources/scripts when declared) fresh, and persist the new record. Local
 * units are skipped entirely. Cleanup is driven only by the registry file —
 * there is no naming-prefix fallback scan.
 */
export function register(aiskHome: string, globalSkillsDir: string): RegisterResult {
  mkdirSync(globalSkillsDir, { recursive: true });

  const prev = readRegistry(globalSkillsDir);
  const unregisteredPrevious = unregisterEntries(prev.entries);

  const registered: RegistryEntry[] = [];
  const skippedLocal: string[] = [];

  const unitsDir = join(aiskHome, "units");
  const unitNames = existsSync(unitsDir)
    ? readdirSync(unitsDir).filter((n) => existsSync(join(unitsDir, n, "unit.json")))
    : [];

  for (const unitName of unitNames) {
    const unitJson = readUnitJson(aiskHome, unitName);
    if (!unitJson) continue;
    if (isLocalUnit(unitJson)) {
      skippedLocal.push(unitName);
      continue;
    }

    for (const skill of unitJson.components.skills ?? []) {
      const dirName = globalDirName(unitName, skill.name);
      const dest = join(globalSkillsDir, dirName);
      mkdirSync(dest, { recursive: true });

      ensureSymlink(join(aiskHome, "units", unitName, skill.file), join(dest, "SKILL.md"));

      const resourcesDest = join(dest, "resources");
      if ((unitJson.components.resources ?? []).length > 0) {
        ensureSymlink(join(aiskHome, "units", unitName, "resources"), resourcesDest);
      } else {
        removeIfSymlink(resourcesDest);
      }

      const scriptsDest = join(dest, "scripts");
      if ((unitJson.components.scripts ?? []).length > 0) {
        ensureSymlink(join(aiskHome, "units", unitName, "scripts"), scriptsDest);
      } else {
        removeIfSymlink(scriptsDest);
      }

      registered.push({ unit: unitName, skill: skill.name, dir: dest });
    }
  }

  writeRegistry(globalSkillsDir, registered);

  return { registered, unregisteredPrevious, skippedLocal };
}

/** Remove everything the registry record lists and delete the record itself. Whole-registry only. */
export function unregister(globalSkillsDir: string): UnregisterResult {
  const prev = readRegistry(globalSkillsDir);
  const removed = unregisterEntries(prev.entries);
  const registryPath = join(globalSkillsDir, REGISTRY_FILENAME);
  if (existsSync(registryPath)) rmSync(registryPath);
  return { removed };
}

function printRegisterResult({
  registered,
  unregisteredPrevious,
  skippedLocal,
}: RegisterResult): void {
  console.log(`已注册 ${registered.length} 个:`);
  for (const r of registered) {
    console.log(`  ${r.unit}${r.skill ? "/" + r.skill : ""} -> ${r.dir}`);
  }
  if (unregisteredPrevious.length > 0) {
    console.log(`\n清理了上次注册的 ${unregisteredPrevious.length} 个条目`);
  }
  if (skippedLocal.length > 0) {
    console.log(`\n跳过的本地 unit:${skippedLocal.join(", ")}`);
  }
}

function printUnregisterResult({ removed }: UnregisterResult): void {
  if (removed.length === 0) {
    console.log("没有已注册的内容。");
    return;
  }
  console.log(`已清空 ${removed.length} 个已注册条目:`);
  for (const r of removed) {
    console.log(`  ${r.unit}${r.skill ? "/" + r.skill : ""} -> ${r.dir}`);
  }
}

if (require.main === module) {
  const aiskHome = resolve(__dirname, "..");
  const globalSkillsDir = join(homedir(), ".claude", "skills");
  const action = process.argv[2] ?? "register";

  if (action === "register") {
    printRegisterResult(register(aiskHome, globalSkillsDir));
  } else if (action === "unregister") {
    printUnregisterResult(unregister(globalSkillsDir));
  } else {
    console.error(`Unknown action: "${action}". Use "register" or "unregister".`);
    process.exit(1);
  }
}
