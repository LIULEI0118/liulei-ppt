#!/usr/bin/env node

import path from "node:path";
import { parseArgs, readJson, requireArg } from "./runtime.mjs";

const allowedLayouts = new Set([
  "title",
  "section",
  "statement",
  "bullets",
  "two-column",
  "chart",
  "table",
  "hero-image",
  "metric",
  "quote",
  "timeline",
  "closing",
]);

export function validatePlan(plan) {
  const errors = [];
  for (const key of ["title", "audience", "goal", "language", "aspectRatio"]) {
    if (typeof plan?.[key] !== "string" || !plan[key].trim()) {
      errors.push(`${key} must be a non-empty string`);
    }
  }
  if (!["16:9", "4:3"].includes(plan?.aspectRatio)) {
    errors.push("aspectRatio must be 16:9 or 4:3");
  }
  if (!Array.isArray(plan?.slides) || plan.slides.length === 0) {
    errors.push("slides must contain at least one slide");
  } else {
    plan.slides.forEach((slide, index) => {
      const label = `slides[${index}]`;
      if (typeof slide?.title !== "string" || !slide.title.trim()) {
        errors.push(`${label}.title must be a non-empty string`);
      }
      if (typeof slide?.role !== "string" || !slide.role.trim()) {
        errors.push(`${label}.role must be a non-empty string`);
      }
      if (!allowedLayouts.has(slide?.layout)) {
        errors.push(`${label}.layout is unsupported: ${slide?.layout}`);
      }
      if (slide?.layout === "chart") {
        const chart = slide.chart;
        if (!chart || !Array.isArray(chart.categories) || !Array.isArray(chart.series)) {
          errors.push(`${label}.chart requires categories and series arrays`);
        } else {
          chart.series.forEach((series, seriesIndex) => {
            if (!Array.isArray(series.values) || series.values.length !== chart.categories.length) {
              errors.push(`${label}.chart.series[${seriesIndex}] values must match categories`);
            }
          });
        }
      }
      if (slide?.layout === "table") {
        const values = slide.table?.values;
        if (!Array.isArray(values) || values.length < 2 || !Array.isArray(values[0])) {
          errors.push(`${label}.table.values must be a rectangular matrix with a header`);
        } else {
          const columns = values[0].length;
          if (!columns || values.some((row) => !Array.isArray(row) || row.length !== columns)) {
            errors.push(`${label}.table.values must be rectangular`);
          }
        }
      }
      if (slide?.layout === "hero-image" && (typeof slide.imagePath !== "string" || !slide.imagePath.trim())) {
        errors.push(`${label}.imagePath is required for hero-image`);
      }
      if (slide?.layout === "metric" && (typeof slide.metricValue !== "string" || !slide.metricValue.trim())) {
        errors.push(`${label}.metricValue is required for metric`);
      }
      if (slide?.layout === "quote" && (typeof slide.quote !== "string" || !slide.quote.trim())) {
        errors.push(`${label}.quote is required for quote`);
      }
      if (slide?.layout === "timeline") {
        if (!Array.isArray(slide.steps) || slide.steps.length < 2 || slide.steps.length > 5) {
          errors.push(`${label}.steps must contain 2–5 timeline steps`);
        }
      }
    });
  }
  return errors;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = path.resolve(requireArg(args, "plan"));
  const plan = await readJson(planPath);
  const errors = validatePlan(plan);
  if (errors.length) {
    console.error(JSON.stringify({ ok: false, plan: planPath, errors }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ ok: true, plan: planPath, slides: plan.slides.length }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
