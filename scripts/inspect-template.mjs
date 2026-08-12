#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {
  countItems,
  loadArtifactTool,
  parseArgs,
  requireArg,
  saveBlob,
  writeJson,
} from "./runtime.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pptxPath = path.resolve(requireArg(args, "pptx"));
  const workspace = path.resolve(args.workspace || path.join(path.dirname(pptxPath), `${path.basename(pptxPath, ".pptx")}-inspect`));
  const previewDir = path.join(workspace, "slides");
  const layoutDir = path.join(workspace, "layouts");
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });

  const { FileBlob, PresentationFile } = await loadArtifactTool();
  const presentation = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  const slideCount = countItems(presentation.slides);
  const layouts = [];
  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await saveBlob(path.join(previewDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    const layoutBlob = await slide.export({ format: "layout" });
    const layoutText = await layoutBlob.text();
    await fs.writeFile(path.join(layoutDir, `${stem}.json`), layoutText, "utf8");
    layouts.push(JSON.parse(layoutText));
  }
  await saveBlob(path.join(workspace, "montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 0.55 }));
  const inspection = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes,layout",
    maxChars: 250000,
  });
  await fs.writeFile(path.join(workspace, "template-inspect.ndjson"), inspection.ndjson || "", "utf8");
  await writeJson(path.join(workspace, "template-manifest.json"), {
    source: pptxPath,
    slideCount,
    previewDir,
    layoutDir,
    createdAt: new Date().toISOString(),
  });

  console.log(JSON.stringify({ ok: true, source: pptxPath, workspace, slideCount }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
