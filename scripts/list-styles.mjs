#!/usr/bin/env node

import path from "node:path";
import { readJson, skillDirFromScript } from "./runtime.mjs";

const skillDir = skillDirFromScript(import.meta.url);
const catalogPath = path.join(skillDir, "assets", "styles", "catalog.json");
const catalog = await readJson(catalogPath);
const resolved = await Promise.all(catalog.styles.map(async (style) => {
  const profilePath = path.resolve(path.dirname(catalogPath), style.profile);
  const profile = await readJson(profilePath);
  return {
    ...style,
    description: profile.description,
    pageSilhouettes: profile.composition?.pageSilhouettes || [],
    profile: profilePath,
    sample: path.resolve(path.dirname(catalogPath), style.sample),
    preview: path.resolve(path.dirname(catalogPath), style.preview),
  };
}));
console.log(JSON.stringify({ styles: resolved }, null, 2));
