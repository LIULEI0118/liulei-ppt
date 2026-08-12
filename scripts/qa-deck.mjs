#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  loadArtifactTool,
  makeMontage,
  parseArgs,
  requireArg,
  saveBlob,
  writeJson,
} from "./runtime.mjs";

const execFileAsync = promisify(execFile);

function walkPositions(value, issues, slideNumber, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkPositions(entry, issues, slideNumber, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const position = value.position || (
    Number.isFinite(value.left) && Number.isFinite(value.top) &&
    Number.isFinite(value.width) && Number.isFinite(value.height)
      ? value
      : undefined
  );
  if (position) {
    const { left, top, width, height } = position;
    if ([left, top, width, height].every(Number.isFinite)) {
      if (left < -1 || top < -1 || width < 0 || height < 0) {
        issues.push({ slide: slideNumber, type: "invalid-position", trail, position });
      }
    }
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key !== "position") walkPositions(entry, issues, slideNumber, `${trail}.${key}`);
  }
}

async function placeholderIssues(pptxPath) {
  try {
    const { stdout } = await execFileAsync("unzip", ["-p", pptxPath, "ppt/slides/slide*.xml"], { maxBuffer: 20 * 1024 * 1024 });
    const shapes = stdout.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
    return shapes.flatMap((shape, index) => {
      if (!/<p:ph\b/.test(shape)) return [];
      const text = [...shape.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => match[1].replace(/<[^>]+>/g, "")).join("").trim();
      return text ? [] : [{ type: "empty-placeholder", shapeIndex: index }];
    });
  } catch (error) {
    return [{ type: "placeholder-scan-failed", message: error.message }];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pptxPath = path.resolve(requireArg(args, "pptx"));
  const reportPath = path.resolve(requireArg(args, "report"));
  const previewDir = path.resolve(args["preview-dir"] || path.join(path.dirname(reportPath), "qa-preview"));
  const stat = await fs.stat(pptxPath);
  if (!stat.isFile() || stat.size < 1024) throw new Error(`PPTX is missing or too small: ${pptxPath}`);
  await fs.mkdir(previewDir, { recursive: true });

  const { FileBlob, PresentationFile } = await loadArtifactTool();
  const presentation = await PresentationFile.importPptx(await FileBlob.load(pptxPath));
  const issues = [];
  const slides = [];
  const renderPaths = [];
  for (const [index, slide] of presentation.slides.items.entries()) {
    const slideNumber = index + 1;
    const stem = `slide-${String(slideNumber).padStart(2, "0")}`;
    await saveBlob(path.join(previewDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    renderPaths.push(path.join(previewDir, `${stem}.png`));
    const layoutBlob = await slide.export({ format: "layout" });
    const layout = JSON.parse(await layoutBlob.text());
    await writeJson(path.join(previewDir, `${stem}.layout.json`), layout);
    walkPositions(layout, issues, slideNumber);
    slides.push({ slideNumber, render: path.join(previewDir, `${stem}.png`) });
  }
  await makeMontage(renderPaths, path.join(previewDir, "montage.png"));
  issues.push(...await placeholderIssues(pptxPath));

  const inspection = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes",
    maxChars: 150000,
  });
  const unresolvedPatterns = [
    /click to add/i,
    /title goes here/i,
    /name goes here/i,
    />slide number</i,
    />date</i,
    />footer</i,
  ];
  for (const pattern of unresolvedPatterns) {
    if (pattern.test(inspection.ndjson || "")) {
      issues.push({ type: "unresolved-template-prompt", pattern: String(pattern) });
    }
  }
  const expected = args["expected-count"] ? Number.parseInt(args["expected-count"], 10) : undefined;
  if (expected !== undefined && expected !== slides.length) {
    issues.push({ type: "slide-count-mismatch", expected, actual: slides.length });
  }

  const report = {
    ok: issues.length === 0,
    pptx: pptxPath,
    bytes: stat.size,
    slideCount: slides.length,
    previewDir,
    issues,
    visualReviewRequired: true,
    generatedAt: new Date().toISOString(),
  };
  await writeJson(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
