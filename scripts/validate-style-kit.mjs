#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { readJson, skillDirFromScript } from "./runtime.mjs";

const skillDir = skillDirFromScript(import.meta.url);
const stylesDir = path.join(skillDir, "assets", "styles");
const catalog = await readJson(path.join(stylesDir, "catalog.json"));
const errors = [];
const requiredProfileKeys = ["id", "name", "description", "approvedDirection", "colors", "fonts", "type", "layout", "composition", "assets", "treatments", "avoid"];

for (const entry of catalog.styles || []) {
  const profilePath = path.resolve(stylesDir, entry.profile);
  const samplePath = path.resolve(stylesDir, entry.sample);
  const previewPath = path.resolve(stylesDir, entry.preview);
  let profile;
  try {
    profile = await readJson(profilePath);
  } catch (error) {
    errors.push(`${entry.id}: cannot read profile (${error.message})`);
    continue;
  }
  for (const key of requiredProfileKeys) {
    if (profile[key] === undefined) errors.push(`${entry.id}: profile is missing ${key}`);
  }
  if (profile.id !== entry.id) errors.push(`${entry.id}: catalog/profile id mismatch`);
  if (!Array.isArray(profile.composition?.pageSilhouettes) || profile.composition.pageSilhouettes.length < 4) {
    errors.push(`${entry.id}: at least four page silhouettes are required`);
  }
  if (!profile.assets?.imagePromptStyle) errors.push(`${entry.id}: assets.imagePromptStyle is required`);
  if (!Array.isArray(profile.avoid) || profile.avoid.length < 3) errors.push(`${entry.id}: avoid list is too short`);
  for (const [kind, assetPath] of [["sample", samplePath], ["preview", previewPath]]) {
    try {
      const stat = await fs.stat(assetPath);
      if (!stat.isFile() || stat.size === 0) errors.push(`${entry.id}: ${kind} is empty`);
    } catch {
      errors.push(`${entry.id}: ${kind} is missing (${assetPath})`);
    }
  }
}

if (catalog.styles?.length !== 6) errors.push(`catalog must contain exactly six styles; found ${catalog.styles?.length || 0}`);

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, styles: catalog.styles.map((entry) => entry.id) }, null, 2));
}
