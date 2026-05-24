import { readFileSync } from "fs";
import { join } from "path";

export interface SkillManifest {
  version: string;
  skills: Record<string, SkillManifestEntry>;
}

export interface SkillManifestEntry {
  targets: {
    claude: boolean;
    codex: boolean;
  };
  codex?: {
    name: string;
    description: string;
    shortDescription: string;
  };
}

export function readSkillManifest(repoRoot: string): SkillManifest {
  return JSON.parse(
    readFileSync(join(repoRoot, "skills", "manifest.json"), "utf-8"),
  ) as SkillManifest;
}

export function validateSkillManifest(manifest: SkillManifest): string[] {
  const errors: string[] = [];

  if (manifest.version !== "1.0") errors.push("manifest.version must be 1.0");
  if (!manifest.skills || typeof manifest.skills !== "object") {
    errors.push("manifest.skills must be an object");
    return errors;
  }

  const codexNames = new Set<string>();

  for (const [src, entry] of Object.entries(manifest.skills)) {
    if (!src.endsWith(".md")) errors.push(`${src}: key must point to a markdown skill source`);
    if (!entry.targets) {
      errors.push(`${src}: targets is required`);
      continue;
    }

    if (typeof entry.targets.claude !== "boolean") {
      errors.push(`${src}: targets.claude must be boolean`);
    }
    if (typeof entry.targets.codex !== "boolean") {
      errors.push(`${src}: targets.codex must be boolean`);
    }

    if (entry.targets.codex) {
      if (!entry.codex) {
        errors.push(`${src}: codex metadata is required when targets.codex is true`);
        continue;
      }

      if (!/^aisk-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.codex.name)) {
        errors.push(`${src}: codex.name must be kebab-case with aisk- prefix`);
      }
      if (codexNames.has(entry.codex.name)) {
        errors.push(`${src}: duplicate codex.name ${entry.codex.name}`);
      }
      codexNames.add(entry.codex.name);

      if (!entry.codex.description.trim()) {
        errors.push(`${src}: codex.description is required`);
      }
      if (!entry.codex.shortDescription.trim()) {
        errors.push(`${src}: codex.shortDescription is required`);
      }
    }
  }

  return errors;
}
