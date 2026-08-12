#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {
  loadArtifactTool,
  parseArgs,
  readJson,
  requireArg,
  saveBlob,
  skillDirFromScript,
  writeJson,
} from "./runtime.mjs";

const SKILL_DIR = skillDirFromScript(import.meta.url);

function collect(value, state) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collect(entry, state));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      const colorMatches = entry.match(/#[0-9a-fA-F]{6}/g) || [];
      colorMatches.forEach((color) => state.colors.set(color.toUpperCase(), (state.colors.get(color.toUpperCase()) || 0) + 1));
      if (/font(Family|Face|Name)/i.test(key) && entry.length < 100) {
        state.fonts.set(entry, (state.fonts.get(entry) || 0) + 1);
      }
    } else {
      collect(entry, state);
    }
  }
}

function ranked(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

function choosePalette(colors, fallback) {
  const neutrals = new Set(["#FFFFFF", "#000000", "#FDFDFD", "#FEFEFE"]);
  const distinctive = colors.filter((color) => !neutrals.has(color));
  return {
    background: colors.includes("#FFFFFF") ? "#FFFFFF" : fallback.colors.background,
    surface: fallback.colors.surface,
    text: colors.includes("#000000") ? "#111111" : fallback.colors.text,
    muted: fallback.colors.muted,
    primary: distinctive[0] || fallback.colors.primary,
    secondary: distinctive[1] || fallback.colors.secondary,
    accent: distinctive[2] || fallback.colors.accent,
    border: distinctive[3] || fallback.colors.border,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pptxPath = path.resolve(requireArg(args, "pptx"));
  const outputPath = path.resolve(requireArg(args, "out"));
  const previewDir = path.resolve(args["preview-dir"] || path.join(path.dirname(outputPath), "reference-preview"));
  const fallback = await readJson(path.join(SKILL_DIR, "assets", "styles", "business-minimal.json"));
  await fs.mkdir(previewDir, { recursive: true });

  const { FileBlob, PresentationFile } = await loadArtifactTool();
  const presentation = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  const state = { colors: new Map(), fonts: new Map() };
  const slideLayouts = [];
  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await saveBlob(path.join(previewDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    const layoutBlob = await slide.export({ format: "layout" });
    const layout = JSON.parse(await layoutBlob.text());
    await writeJson(path.join(previewDir, `${stem}.layout.json`), layout);
    collect(layout, state);
    slideLayouts.push({ slide: index + 1, layout });
  }
  await saveBlob(path.join(previewDir, "montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 0.55 }));

  const colors = ranked(state.colors);
  const fonts = ranked(state.fonts);
  const profile = {
    ...fallback,
    id: `extracted-${path.basename(pptxPath, path.extname(pptxPath)).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "style"}`,
    name: `提取风格：${path.basename(pptxPath)}`,
    description: "从参考 PPTX 的完整页面布局和渲染结果中提取；生成前应人工检查预览并按需微调。",
    colors: choosePalette(colors, fallback),
    fonts: {
      heading: fonts[0] || fallback.fonts.heading,
      body: fonts[1] || fonts[0] || fallback.fonts.body,
    },
    extraction: {
      source: pptxPath,
      slideCount: presentation.slides.items.length,
      observedColors: colors.slice(0, 16),
      observedFonts: fonts.slice(0, 12),
      previewDir,
      reviewed: false,
    },
  };
  await writeJson(outputPath, profile);
  console.log(JSON.stringify({
    ok: true,
    source: pptxPath,
    output: outputPath,
    previewDir,
    slides: presentation.slides.items.length,
    colors: colors.slice(0, 8),
    fonts: fonts.slice(0, 6),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
