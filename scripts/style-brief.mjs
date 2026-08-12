#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, readJson, requireArg, skillDirFromScript } from "./runtime.mjs";

const skillDir = skillDirFromScript(import.meta.url);
const stylesDir = path.join(skillDir, "assets", "styles");
const catalog = await readJson(path.join(stylesDir, "catalog.json"));
const args = parseArgs(process.argv.slice(2));
const styleId = requireArg(args, "style");
const entry = catalog.styles.find((item) => item.id === styleId);

if (!entry) {
  throw new Error(`Unknown style: ${styleId}. Available: ${catalog.styles.map((item) => item.id).join(", ")}`);
}

const profilePath = path.resolve(stylesDir, entry.profile);
const profile = await readJson(profilePath);
const sample = path.resolve(stylesDir, entry.sample);
const preview = path.resolve(stylesDir, entry.preview);

for (const asset of [sample, preview]) {
  await fs.access(asset);
}

console.log(JSON.stringify({
  id: profile.id,
  name: profile.name,
  approvedDirection: profile.approvedDirection,
  description: profile.description,
  profile: profilePath,
  sample,
  preview,
  pageSilhouettes: profile.composition?.pageSilhouettes || [],
  assetLanguage: profile.assets || {},
  avoid: profile.avoid || [],
  designReferences: profile.designReferences || [],
  recipe: path.join(skillDir, "references", "style-recipes.md"),
}, null, 2));
