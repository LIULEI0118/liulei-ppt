#!/usr/bin/env node

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  loadArtifactTool,
  makeMontage,
  parseArgs,
  readJson,
  requireArg,
  saveBlob,
  skillDirFromScript,
} from "./runtime.mjs";
import { validatePlan } from "./validate-plan.mjs";

const SKILL_DIR = skillDirFromScript(import.meta.url);
let PLAN_DIR = process.cwd();
const SLIDE_SIZES = {
  "16:9": { width: 1280, height: 720 },
  "4:3": { width: 1024, height: 768 },
};

function addShape(slide, geometry, position, fill, line = "none", name) {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line: line === "none" ? { style: "solid", fill: "none", width: 0 } : line,
    ...(name ? { name } : {}),
  });
}

function addText(slide, text, position, style, options = {}) {
  const shape = addShape(slide, "textbox", position, "none", "none", options.name);
  shape.text = String(text ?? "");
  shape.text.style = {
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    bold: style.bold ?? false,
    color: style.color,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    lineSpacing: style.lineSpacing ?? 1.08,
  };
  return shape;
}

function bodyText(slide, text, position, style, options = {}) {
  return addText(
    slide,
    text,
    position,
    {
      fontSize: options.fontSize ?? style.type.body,
      fontFamily: style.fonts.body,
      color: options.color ?? style.colors.text,
      bold: options.bold,
      lineSpacing: options.lineSpacing ?? 1.18,
      alignment: options.alignment,
    },
    options,
  );
}

function titleText(slide, text, position, style, options = {}) {
  return addText(
    slide,
    text,
    position,
    {
      fontSize: options.fontSize ?? style.type.slideTitle,
      fontFamily: style.fonts.heading,
      color: options.color ?? style.colors.text,
      bold: options.bold ?? true,
      lineSpacing: options.lineSpacing ?? 0.98,
      alignment: options.alignment,
    },
    options,
  );
}

function resolveAssetPath(assetPath) {
  if (!assetPath) return undefined;
  return path.isAbsolute(assetPath) ? assetPath : path.resolve(PLAN_DIR, assetPath);
}

function addImage(slide, assetPath, position, options = {}) {
  const resolved = resolveAssetPath(assetPath);
  if (!resolved || !fsSync.existsSync(resolved)) throw new Error(`Image asset not found: ${assetPath}`);
  const extension = path.extname(resolved).toLowerCase();
  const contentTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
  if (!contentTypes[extension]) throw new Error(`Unsupported image type: ${extension}`);
  const bytes = fsSync.readFileSync(resolved);
  return slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: contentTypes[extension],
    alt: options.alt || path.basename(resolved),
    fit: options.fit || "cover",
    position,
    geometry: options.geometry || "rect",
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
}

function addMotif(slide, item, style, size, page, index) {
  const { colors } = style;
  const motif = style.treatments?.motif;
  const emphatic = ["title", "section", "statement", "closing"].includes(item.layout);
  if (motif === "editorial-spine") {
    addShape(slide, "rect", { left: page.left, top: 34, width: 52, height: 4 }, colors.primary);
    if (!emphatic) addText(slide, String(index + 1).padStart(2, "0"), { left: 20, top: page.top, width: 48, height: 24 }, {
      fontSize: 10, fontFamily: style.fonts.body, color: colors.primary, bold: true,
    });
  } else if (motif === "lime-band") {
    addShape(slide, "rect", { left: page.left, top: 28, width: 26, height: 4 }, colors.primary);
    addText(slide, "LIULEI PPT", { left: page.left + 38, top: 22, width: 120, height: 16 }, {
      fontSize: 8, fontFamily: style.fonts.body, color: colors.text, bold: true,
    });
  } else if (motif === "sonar-grid") {
    addShape(slide, "rect", { left: page.left, top: 32, width: 104, height: 2 }, colors.primary);
    if (emphatic) {
      addShape(slide, "ellipse", { left: size.width - 202, top: 52, width: 128, height: 128 }, "none", { style: "solid", fill: colors.border, width: 1 });
      addShape(slide, "ellipse", { left: size.width - 174, top: 80, width: 72, height: 72 }, "none", { style: "solid", fill: colors.primary, width: 1 });
    }
  } else if (motif === "prism-line") {
    addShape(slide, "rect", { left: page.left, top: 30, width: 74, height: 3 }, colors.primary);
    if (emphatic) {
      addShape(slide, "rect", { left: size.width - 148, top: 32, width: 76, height: 76 }, colors.secondary);
      addShape(slide, "ellipse", { left: size.width - 98, top: 82, width: 46, height: 46 }, colors.accent);
    }
  } else if (motif === "research-blue") {
    addShape(slide, "rect", { left: page.left, top: 30, width: emphatic ? 118 : 74, height: 4 }, colors.primary);
    if (!emphatic) addText(slide, `EVIDENCE / ${String(index + 1).padStart(2, "0")}`, { left: size.width - page.left - 150, top: 24, width: 150, height: 16 }, {
      fontSize: 8, fontFamily: style.fonts.body, color: colors.primary, bold: true, alignment: "right",
    });
  } else if (motif === "editorial-grid") {
    addShape(slide, "rect", { left: page.left, top: 28, width: 44, height: 3 }, colors.primary);
    addShape(slide, "rect", { left: page.left, top: size.height - 46, width: page.width, height: 1 }, colors.border);
    if (!emphatic) addShape(slide, "rect", { left: page.left + page.width * 0.25, top: page.top, width: 1, height: page.height - 18 }, colors.border);
  } else if (motif === "top-band") {
    addShape(slide, "rect", { left: 0, top: 0, width: size.width, height: 14 }, colors.primary);
  } else if (motif === "glow-orbit") {
    if (emphatic) {
      addShape(slide, "ellipse", { left: size.width - 260, top: -132, width: 330, height: 330 }, colors.primary);
      addShape(slide, "ellipse", { left: size.width - 164, top: -36, width: 136, height: 136 }, colors.background);
    } else {
      addShape(slide, "rect", { left: page.left, top: 35, width: 92, height: 3 }, colors.accent);
    }
  } else if (motif === "soft-blocks") {
    if (emphatic) {
      addShape(slide, "roundRect", { left: size.width - 224, top: 34, width: 142, height: 142 }, colors.secondary);
      addShape(slide, "ellipse", { left: size.width - 126, top: 118, width: 82, height: 82 }, colors.accent);
    }
  } else if (motif === "citation-rule") {
    addShape(slide, "rect", { left: page.left, top: 34, width: 86, height: 5 }, colors.accent);
  } else if (motif === "editorial-index") {
    addText(slide, "LIULEI / PPT", { left: size.width - 190, top: 30, width: 120, height: 20 }, {
      fontSize: 10,
      fontFamily: style.fonts.body,
      color: colors.muted,
      bold: true,
      alignment: "right",
    });
  } else {
    addShape(slide, "rect", { left: page.left, top: 36, width: index % 3 === 0 ? 112 : 68, height: 5 }, colors.primary);
  }
}

function addFooter(slide, item, index, style, size, page, plan) {
  const refs = Array.isArray(item.sourceRefs) ? item.sourceRefs.join(" · ") : "";
  if (refs) {
    addText(slide, refs, { left: page.left, top: size.height - 31, width: size.width - page.left * 2 - 48, height: 15 }, {
      fontSize: style.type.caption,
      fontFamily: style.fonts.body,
      color: style.colors.muted,
    });
  }
  addText(slide, String(index + 1).padStart(2, "0"), { left: size.width - page.left - 34, top: size.height - 32, width: 34, height: 15 }, {
    fontSize: style.type.caption,
    fontFamily: style.fonts.body,
    color: style.colors.muted,
    bold: true,
    alignment: "right",
  });
  if (item.notes) {
    slide.speakerNotes.textFrame.setText(item.notes);
    slide.speakerNotes.setVisible(true);
  }
  if (plan.sources?.length && refs) {
    const missing = item.sourceRefs.filter((id) => !plan.sources.some((source) => source.id === id));
    if (missing.length) throw new Error(`Unknown sourceRefs on slide ${index + 1}: ${missing.join(", ")}`);
  }
}

function addStandardTitle(slide, item, style, page) {
  if (item.eyebrow) {
    addText(slide, item.eyebrow.toUpperCase(), { left: page.left, top: page.top + 2, width: 420, height: 24 }, {
      fontSize: 12,
      fontFamily: style.fonts.body,
      color: style.colors.primary,
      bold: true,
    });
  }
  titleText(slide, item.title, { left: page.left, top: page.top + 34, width: page.width, height: 86 }, style);
}

function renderTitle(slide, item, style, size, page) {
  if (style.id === "business-minimal") {
    const spineX = Math.round(size.width * 0.66);
    addShape(slide, "rect", { left: spineX, top: 0, width: size.width - spineX, height: 214 }, style.colors.primary);
    addShape(slide, "rect", { left: spineX, top: 214, width: size.width - spineX, height: size.height - 214 }, style.colors.secondary);
    addText(slide, "01", { left: spineX + 42, top: 50, width: 100, height: 72 }, {
      fontSize: 42, fontFamily: style.fonts.heading, color: style.colors.background, bold: true,
    });
    addText(slide, "VISUAL\nSYSTEM", { left: spineX + 42, top: 254, width: 250, height: 116 }, {
      fontSize: 31, fontFamily: style.fonts.heading, color: style.colors.background, bold: true, lineSpacing: 0.88,
    });
    addText(slide, (item.eyebrow || "LIULEI PPT").toUpperCase(), { left: page.left, top: 62, width: 320, height: 22 }, {
      fontSize: 10, fontFamily: style.fonts.body, color: style.colors.primary, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: 132, width: spineX - page.left - 70, height: 220 }, style, { fontSize: 60, lineSpacing: 0.86 });
    bodyText(slide, item.body || "", { left: page.left, top: 400, width: spineX - page.left - 120, height: 76 }, style, { color: style.colors.text, fontSize: style.type.subhead });
    addShape(slide, "rect", { left: page.left, top: 520, width: spineX - page.left - 110, height: 1 }, style.colors.text);
    return;
  }
  if (style.id === "consulting-data") {
    const photoH = item.imagePath ? 220 : 92;
    if (item.imagePath) addImage(slide, item.imagePath, { left: 0, top: 0, width: size.width, height: photoH }, { alt: item.imageAlt });
    else addShape(slide, "rect", { left: 0, top: 0, width: size.width, height: photoH }, style.colors.secondary);
    addShape(slide, "rect", { left: 0, top: photoH, width: size.width, height: 122 }, style.colors.primary);
    addText(slide, "2026", { left: page.left, top: photoH + 34, width: 120, height: 32 }, {
      fontSize: 22, fontFamily: style.fonts.heading, color: style.colors.text, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: photoH + 172, width: page.width * 0.66, height: 170 }, style, { fontSize: 64, lineSpacing: 0.86 });
    bodyText(slide, item.body || "", { left: page.left + page.width * 0.68, top: photoH + 192, width: page.width * 0.30, height: 110 }, style, { color: style.colors.text, fontSize: 17 });
    return;
  }
  if (style.id === "fresh-creative") {
    const textWidth = Math.round(size.width * 0.39);
    if (item.imagePath) addImage(slide, item.imagePath, { left: textWidth, top: 0, width: size.width - textWidth, height: size.height }, { alt: item.imageAlt });
    else {
      addShape(slide, "rect", { left: textWidth + 130, top: 42, width: 360, height: 510 }, style.colors.primary);
      addShape(slide, "rect", { left: textWidth + 44, top: 118, width: 300, height: 420 }, style.colors.surface);
      addShape(slide, "rect", { left: textWidth + 310, top: 246, width: 170, height: 260 }, style.colors.secondary);
      addShape(slide, "ellipse", { left: textWidth + 394, top: 374, width: 104, height: 104 }, style.colors.accent);
    }
    addText(slide, (item.eyebrow || "FRESH CREATIVE").toUpperCase(), { left: page.left, top: 70, width: 280, height: 20 }, {
      fontSize: 10, fontFamily: style.fonts.body, color: style.colors.primary, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: 140, width: textWidth - page.left - 28, height: 210 }, style, { fontSize: 60, lineSpacing: 0.86 });
    bodyText(slide, item.body || "", { left: page.left, top: 390, width: textWidth - page.left - 42, height: 90 }, style, { fontSize: style.type.subhead });
    return;
  }
  if (style.id === "academic-report") {
    const blueW = Math.round(size.width * 0.40);
    addShape(slide, "rect", { left: 0, top: 0, width: blueW, height: size.height }, style.colors.primary);
    if (item.imagePath) addImage(slide, item.imagePath, { left: blueW, top: 0, width: size.width - blueW, height: size.height }, { alt: item.imageAlt });
    else {
      addShape(slide, "ellipse", { left: blueW + 155, top: 86, width: 350, height: 350 }, style.colors.secondary);
      addShape(slide, "ellipse", { left: blueW + 258, top: 156, width: 170, height: 170 }, style.colors.accent);
    }
    addText(slide, (item.eyebrow || "ACADEMIC REPORT").toUpperCase(), { left: page.left, top: 58, width: 280, height: 20 }, {
      fontSize: 10, fontFamily: style.fonts.body, color: style.colors.background, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: 146, width: blueW - page.left - 34, height: 210 }, style, { fontSize: 56, color: style.colors.background, lineSpacing: 0.86 });
    bodyText(slide, item.body || "", { left: page.left, top: 390, width: blueW - page.left - 44, height: 90 }, style, { fontSize: 19, color: style.colors.background });
    return;
  }
  if (style.id === "editorial-premium") {
    if (item.imagePath) addImage(slide, item.imagePath, { left: 0, top: 0, width: size.width, height: size.height }, { alt: item.imageAlt });
    addText(slide, (item.eyebrow || "THE FIRST ISSUE").toUpperCase(), { left: page.left, top: page.top + 10, width: 250, height: 20 }, {
      fontSize: 9, fontFamily: style.fonts.body, color: style.colors.primary, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: page.top + 92, width: page.width * 0.64, height: 300 }, style, {
      fontSize: style.type.deckTitle + 8, lineSpacing: 0.82,
    });
    bodyText(slide, item.body || "", { left: page.left, top: page.top + 430, width: page.width * 0.44, height: 80 }, style, {
      fontSize: style.type.subhead, color: style.colors.text,
    });
    return;
  }
  if (style.id === "tech-dark") {
    addText(slide, (item.eyebrow || "SYSTEM BRIEF").toUpperCase(), { left: page.left, top: page.top + 34, width: 360, height: 26 }, {
      fontSize: 13, fontFamily: style.fonts.body, color: style.colors.accent, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: page.top + 126, width: page.width * 0.72, height: 240 }, style, {
      fontSize: style.type.deckTitle + 4, lineSpacing: 0.9,
    });
    bodyText(slide, item.body || "", { left: page.left, top: page.top + 398, width: page.width * 0.55, height: 90 }, style, {
      fontSize: style.type.subhead, color: style.colors.muted,
    });
    addShape(slide, "rect", { left: page.left, top: page.top + 528, width: page.width, height: 2 }, style.colors.border);
    addShape(slide, "rect", { left: page.left, top: page.top + 528, width: page.width * 0.34, height: 2 }, style.colors.accent);
    return;
  }
  const leftWidth = Math.round(page.width * 0.66);
  addText(slide, (item.eyebrow || "PRESENTATION").toUpperCase(), { left: page.left, top: page.top + 24, width: 360, height: 26 }, {
    fontSize: 13,
    fontFamily: style.fonts.body,
    color: style.colors.primary,
    bold: true,
  });
  titleText(slide, item.title, { left: page.left, top: page.top + 112, width: leftWidth, height: 210 }, style, {
    fontSize: style.type.deckTitle,
    lineSpacing: 0.92,
  });
  if (item.body) {
    bodyText(slide, item.body, { left: page.left, top: page.top + 350, width: leftWidth - 20, height: 100 }, style, {
      fontSize: style.type.subhead,
      color: style.colors.muted,
    });
  }
  const accentX = page.left + leftWidth + 62;
  addShape(slide, "rect", { left: accentX, top: page.top + 112, width: 12, height: 340 }, style.colors.primary);
  addShape(slide, "rect", { left: accentX + 38, top: page.top + 232, width: 128, height: 220 }, style.colors.secondary);
  addShape(slide, "rect", { left: accentX + 194, top: page.top + 318, width: 72, height: 134 }, style.colors.accent);
}

function renderHeroImage(slide, item, style, size, page) {
  const side = item.imagePosition || (style.id === "editorial-premium" ? "left" : "right");
  if (side === "full") {
    addImage(slide, item.imagePath, { left: 0, top: 0, width: size.width, height: size.height }, { alt: item.imageAlt });
    addText(slide, (item.eyebrow || item.role).toUpperCase(), { left: page.left, top: page.top + 50, width: 360, height: 24 }, {
      fontSize: 12, fontFamily: style.fonts.body, color: style.colors.accent, bold: true,
    });
    titleText(slide, item.title, { left: page.left, top: page.top + 290, width: page.width * 0.7, height: 190 }, style, {
      fontSize: style.type.deckTitle, color: style.colors.background,
    });
    return;
  }
  const mediaWidth = Math.round(size.width * 0.54);
  const imageLeft = side === "left" ? 0 : size.width - mediaWidth;
  addImage(slide, item.imagePath, { left: imageLeft, top: 0, width: mediaWidth, height: size.height }, {
    alt: item.imageAlt,
    geometry: style.treatments.radius ? "roundRect" : "rect",
    borderRadius: style.treatments.radius ? "rounded-xl" : undefined,
  });
  const textLeft = side === "left" ? imageLeft + mediaWidth + 58 : page.left;
  const textWidth = size.width - mediaWidth - page.left - 72;
  addText(slide, (item.eyebrow || item.role).toUpperCase(), { left: textLeft, top: page.top + 72, width: textWidth, height: 24 }, {
    fontSize: 12, fontFamily: style.fonts.body, color: style.colors.primary, bold: true,
  });
  titleText(slide, item.title, { left: textLeft, top: page.top + 150, width: textWidth, height: 230 }, style, {
    fontSize: style.id === "editorial-premium" ? 44 : style.type.deckTitle - 8,
  });
  bodyText(slide, item.body || "", { left: textLeft, top: page.top + 410, width: textWidth, height: 110 }, style, {
    color: style.colors.muted, fontSize: style.type.subhead,
  });
}

function renderMetric(slide, item, style, size, page) {
  addText(slide, (item.eyebrow || item.role).toUpperCase(), { left: page.left, top: page.top + 54, width: page.width, height: 26 }, {
    fontSize: 12, fontFamily: style.fonts.body, color: style.colors.primary, bold: true,
  });
  if (item.iconPath) {
    addShape(slide, "roundRect", { left: page.left, top: page.top + 126, width: 92, height: 92 }, style.colors.surface);
    addImage(slide, item.iconPath, { left: page.left + 20, top: page.top + 146, width: 52, height: 52 }, { alt: item.metricLabel || "metric icon", fit: "contain" });
  }
  const metricLeft = item.iconPath ? page.left + 132 : page.left;
  addText(slide, item.metricValue, { left: metricLeft, top: page.top + 112, width: page.width - (metricLeft - page.left), height: 190 }, {
    fontSize: Math.min(168, style.type.deckTitle * 2.3), fontFamily: style.fonts.heading, color: style.colors.primary, bold: true,
    lineSpacing: 0.82,
  });
  titleText(slide, item.metricLabel || item.title, { left: page.left, top: page.top + 334, width: page.width * 0.72, height: 90 }, style, {
    fontSize: style.type.slideTitle,
  });
  bodyText(slide, item.body || "", { left: page.left + page.width * 0.54, top: page.top + 432, width: page.width * 0.46, height: 110 }, style, {
    color: style.colors.muted, fontSize: style.type.subhead,
  });
  addShape(slide, "rect", { left: page.left, top: page.top + 516, width: page.width * 0.43, height: 5 }, style.colors.accent);
}

function renderQuote(slide, item, style, size, page) {
  addText(slide, "“", { left: page.left, top: page.top + 42, width: 120, height: 130 }, {
    fontSize: 118, fontFamily: style.fonts.heading, color: style.colors.accent, bold: true,
  });
  titleText(slide, item.quote, { left: page.left + 78, top: page.top + 118, width: page.width - 150, height: 270 }, style, {
    fontSize: style.type.deckTitle - 8, lineSpacing: 0.94,
  });
  addShape(slide, "rect", { left: page.left + 82, top: page.top + 414, width: 84, height: 4 }, style.colors.primary);
  bodyText(slide, item.attribution || item.body || "", { left: page.left + 186, top: page.top + 400, width: page.width - 260, height: 66 }, style, {
    fontSize: style.type.subhead, color: style.colors.muted,
  });
}

function renderTimeline(slide, item, style, size, page) {
  addStandardTitle(slide, item, style, page);
  const steps = item.steps;
  const top = page.top + 236;
  const width = page.width / steps.length;
  addShape(slide, "rect", { left: page.left + width * 0.12, top: top + 28, width: page.width - width * 0.24, height: 3 }, style.colors.border);
  steps.forEach((step, index) => {
    const left = page.left + index * width;
    addShape(slide, "ellipse", { left: left + width * 0.12, top: top, width: 58, height: 58 }, index === 0 ? style.colors.primary : style.colors.surface);
    addText(slide, step.label || String(index + 1).padStart(2, "0"), { left: left + width * 0.12, top: top + 17, width: 58, height: 22 }, {
      fontSize: 12, fontFamily: style.fonts.body, color: index === 0 ? style.colors.background : style.colors.primary, bold: true, alignment: "center",
    });
    titleText(slide, step.title, { left, top: top + 94, width: width - 24, height: 58 }, style, { fontSize: style.type.subhead });
    bodyText(slide, step.body || "", { left, top: top + 164, width: width - 28, height: 116 }, style, { fontSize: style.type.body - 1, color: style.colors.muted });
  });
}

function renderSection(slide, item, style, size, page, index) {
  addText(slide, String(index + 1).padStart(2, "0"), { left: page.left, top: page.top + 55, width: 220, height: 180 }, {
    fontSize: 116,
    fontFamily: style.fonts.heading,
    color: style.colors.primary,
    bold: true,
  });
  titleText(slide, item.title, { left: page.left + 260, top: page.top + 100, width: page.width - 260, height: 160 }, style, {
    fontSize: style.type.deckTitle - 4,
  });
  if (item.body) {
    bodyText(slide, item.body, { left: page.left + 264, top: page.top + 286, width: page.width - 300, height: 120 }, style, {
      color: style.colors.muted,
      fontSize: style.type.subhead,
    });
  }
}

function renderStatement(slide, item, style, size, page) {
  addText(slide, (item.eyebrow || item.role).toUpperCase(), { left: page.left, top: page.top + 80, width: page.width, height: 26 }, {
    fontSize: 12,
    fontFamily: style.fonts.body,
    color: style.colors.primary,
    bold: true,
    alignment: "center",
  });
  titleText(slide, item.title, { left: page.left + 80, top: page.top + 155, width: page.width - 160, height: 220 }, style, {
    fontSize: style.type.deckTitle - 2,
    alignment: "center",
  });
  if (item.body) {
    bodyText(slide, item.body, { left: page.left + 150, top: page.top + 405, width: page.width - 300, height: 90 }, style, {
      fontSize: style.type.subhead,
      color: style.colors.muted,
      alignment: "center",
    });
  }
}

function renderBullets(slide, item, style, size, page) {
  addStandardTitle(slide, item, style, page);
  const bullets = item.bullets?.length ? item.bullets : String(item.body || "").split(/\n+/).filter(Boolean);
  bullets.slice(0, 6).forEach((bullet, index) => {
    const top = page.top + 160 + index * 68;
    addText(slide, String(index + 1).padStart(2, "0"), { left: page.left, top, width: 42, height: 34 }, {
      fontSize: 13,
      fontFamily: style.fonts.body,
      color: style.colors.primary,
      bold: true,
    });
    bodyText(slide, bullet, { left: page.left + 58, top: top - 3, width: page.width - 90, height: 50 }, style, {
      fontSize: style.type.subhead,
    });
    addShape(slide, "rect", { left: page.left + 58, top: top + 48, width: page.width - 58, height: 1 }, style.colors.border);
  });
}

function renderTwoColumn(slide, item, style, size, page) {
  addStandardTitle(slide, item, style, page);
  const top = page.top + 164;
  const colWidth = (page.width - page.gutter) / 2;
  addShape(slide, "rect", { left: page.left + colWidth + page.gutter / 2, top, width: 1, height: 365 }, style.colors.border);
  titleText(slide, item.leftTitle || "01", { left: page.left, top, width: colWidth - 20, height: 52 }, style, {
    fontSize: style.type.subhead,
    color: style.colors.primary,
  });
  bodyText(slide, item.leftBody || "", { left: page.left, top: top + 72, width: colWidth - 36, height: 265 }, style, {
    fontSize: style.type.body + 2,
  });
  const right = page.left + colWidth + page.gutter;
  titleText(slide, item.rightTitle || "02", { left: right, top, width: colWidth - 20, height: 52 }, style, {
    fontSize: style.type.subhead,
    color: style.colors.accent,
  });
  bodyText(slide, item.rightBody || "", { left: right, top: top + 72, width: colWidth - 18, height: 265 }, style, {
    fontSize: style.type.body + 2,
  });
}

function renderChart(slide, item, style, size, page) {
  addStandardTitle(slide, item, style, page);
  if (item.body) {
    bodyText(slide, item.body, { left: page.left, top: page.top + 122, width: page.width, height: 38 }, style, {
      color: style.colors.muted,
      fontSize: style.type.body - 1,
    });
  }
  const chart = item.chart;
  const palette = [style.colors.primary, style.colors.accent, style.colors.secondary];
  const series = chart.series.map((entry, index) => ({
    ...entry,
    fill: entry.fill || palette[index % palette.length],
    line: entry.line || { style: "solid", fill: palette[index % palette.length], width: 3 },
  }));
  slide.charts.add(chart.type || "bar", {
    position: { left: page.left, top: page.top + 184, width: page.width, height: 360 },
    categories: chart.categories,
    series,
    hasLegend: series.length > 1,
    legend: {
      position: "bottom",
      overlay: false,
      textStyle: { fill: style.colors.muted, fontSize: 12 },
    },
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 54 },
    chartFill: style.colors.background,
    plotAreaFill: style.colors.background,
    chartLine: { style: "solid", fill: "none", width: 0 },
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
    xAxis: {
      textStyle: { fill: style.colors.muted, fontSize: 12 },
      line: { style: "solid", fill: style.colors.border, width: 1 },
    },
    yAxis: {
      textStyle: { fill: style.colors.muted, fontSize: 11 },
      majorGridlines: { style: "solid", fill: style.colors.border, width: 1 },
      line: { style: "solid", fill: "none", width: 0 },
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fill: style.colors.text, fontSize: 11, bold: true },
    },
  });
}

function renderTable(slide, item, style, size, page) {
  addStandardTitle(slide, item, style, page);
  const values = item.table.values;
  const rows = values.length;
  const columns = values[0].length;
  const table = slide.tables.add({
    rows,
    columns,
    left: page.left,
    top: page.top + 170,
    width: page.width,
    height: Math.min(360, 52 * rows),
    values,
  });
  table.borders.assign({ style: "solid", fill: style.colors.border, width: 1 });
  table.styleOptions = { headerRow: true, bandedRows: true };
  for (let column = 0; column < columns; column += 1) {
    const cell = table.getCell(0, column);
    cell.fill = style.colors.primary;
    cell.text.style = {
      fontSize: style.type.body - 2,
      fontFamily: style.fonts.body,
      bold: true,
      color: style.colors.background,
    };
  }
  for (let row = 1; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = table.getCell(row, column);
      cell.fill = row % 2 ? style.colors.surface : style.colors.background;
      cell.text.style = {
        fontSize: style.type.body - 2,
        fontFamily: style.fonts.body,
        color: style.colors.text,
      };
    }
  }
}

function renderClosing(slide, item, style, size, page) {
  addShape(slide, "rect", { left: page.left, top: page.top + 92, width: 10, height: 350 }, style.colors.primary);
  addText(slide, (item.eyebrow || "CONCLUSION").toUpperCase(), { left: page.left + 44, top: page.top + 90, width: 360, height: 28 }, {
    fontSize: 13,
    fontFamily: style.fonts.body,
    color: style.colors.primary,
    bold: true,
  });
  titleText(slide, item.title, { left: page.left + 44, top: page.top + 154, width: page.width - 80, height: 190 }, style, {
    fontSize: style.type.deckTitle - 4,
  });
  if (item.body) {
    bodyText(slide, item.body, { left: page.left + 44, top: page.top + 382, width: page.width - 160, height: 100 }, style, {
      fontSize: style.type.subhead,
      color: style.colors.muted,
    });
  }
}

async function loadStyle(styleArg) {
  const candidate = path.resolve(styleArg);
  const stylePath = styleArg.endsWith(".json")
    ? candidate
    : path.join(SKILL_DIR, "assets", "styles", `${styleArg}.json`);
  const style = await readJson(stylePath);
  for (const key of ["id", "colors", "fonts", "type", "layout", "treatments"]) {
    if (!style[key]) throw new Error(`Style ${stylePath} is missing ${key}`);
  }
  return { style, stylePath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = path.resolve(requireArg(args, "plan"));
  PLAN_DIR = path.dirname(planPath);
  const outputPath = path.resolve(requireArg(args, "out"));
  const previewDir = path.resolve(args["preview-dir"] || path.join(path.dirname(outputPath), `${path.basename(outputPath, ".pptx")}-preview`));
  const plan = await readJson(planPath);
  const errors = validatePlan(plan);
  if (errors.length) throw new Error(`Invalid content plan:\n- ${errors.join("\n- ")}`);
  if (plan.approved !== true && args["allow-unapproved"] !== true) {
    throw new Error("Content plan is not approved. Set approved=true after user approval or pass --allow-unapproved.");
  }

  const { style, stylePath } = await loadStyle(args.style || "business-minimal");
  const { Presentation, PresentationFile } = await loadArtifactTool();
  const size = SLIDE_SIZES[plan.aspectRatio];
  const presentation = Presentation.create({ slideSize: size });
  const page = {
    left: style.layout.marginX,
    top: style.layout.marginTop,
    width: size.width - style.layout.marginX * 2,
    height: size.height - style.layout.marginTop - style.layout.marginBottom,
    gutter: style.layout.gutter,
  };

  const renderers = {
    title: renderTitle,
    section: renderSection,
    statement: renderStatement,
    bullets: renderBullets,
    "two-column": renderTwoColumn,
    chart: renderChart,
    table: renderTable,
    "hero-image": renderHeroImage,
    metric: renderMetric,
    quote: renderQuote,
    timeline: renderTimeline,
    closing: renderClosing,
  };

  plan.slides.forEach((item, index) => {
    const slide = presentation.slides.add();
    slide.background.fill = style.colors.background;
    addMotif(slide, item, style, size, page, index);
    renderers[item.layout](slide, item, style, size, page, index);
    addFooter(slide, item, index, style, size, page, plan);
  });

  await fs.mkdir(previewDir, { recursive: true });
  const renderPaths = [];
  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const renderPath = path.join(previewDir, `${stem}.png`);
    await saveBlob(renderPath, await presentation.export({ slide, format: "png", scale: 1 }));
    renderPaths.push(renderPath);
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(previewDir, `${stem}.layout.json`), await layout.text(), "utf8");
  }
  await makeMontage(renderPaths, path.join(previewDir, "montage.png"));
  const pptx = await PresentationFile.exportPptx(presentation);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await pptx.save(outputPath);

  console.log(JSON.stringify({
    ok: true,
    output: outputPath,
    previewDir,
    slides: plan.slides.length,
    style: style.id,
    stylePath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
