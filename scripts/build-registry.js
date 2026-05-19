#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', 'skills');
const outputFile = path.join(__dirname, '..', 'registry.json');

const registry = { version: '1.0', skills: [], sets: [] };

for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const configPath = path.join(skillsDir, entry.name, 'config.json');
  if (!fs.existsSync(configPath)) continue;

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const dirPath = `skills/${entry.name}/`;

  if (config.skills) {
    registry.sets.push({ name: config.name, path: dirPath });
    for (const skillName of config.skills) {
      registry.skills.push({ name: skillName, set: config.name, path: dirPath });
    }
  } else {
    registry.skills.push({ name: config.name, path: dirPath });
  }
}

fs.writeFileSync(outputFile, JSON.stringify(registry, null, 2) + '\n');
console.log(`registry.json updated: ${registry.skills.length} skills, ${registry.sets.length} sets`);
