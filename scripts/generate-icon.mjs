#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { loadRuntimePackage, parseArgs, requireArg } from "./runtime.mjs";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function iconNameCandidates(name) {
  const raw = String(name || "").trim();
  const pascal = raw
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
  return [...new Set([raw, raw.replace(/Icon$/, ""), pascal, pascal.replace(/Icon$/, "")].filter(Boolean))];
}

function renderNode(node) {
  const [tag, attrs = {}, children = []] = node;
  const rendered = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeXml(value)}"`)
    .join(" ");
  const open = rendered ? `<${tag} ${rendered}` : `<${tag}`;
  return children.length ? `${open}>${children.map(renderNode).join("")}</${tag}>` : `${open}/>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = requireArg(args, "name");
  const output = path.resolve(requireArg(args, "out"));
  const color = args.color || "#1738B8";
  const background = args.background || "transparent";
  const size = Number(args.size || 256);
  const padding = Number(args.padding || 28);
  const strokeWidth = Number(args["stroke-width"] || 1.8);
  if (![size, padding, strokeWidth].every(Number.isFinite) || size < 32 || padding < 0 || padding * 2 >= size) {
    throw new Error("Invalid numeric icon options.");
  }

  const [lucide, sharpModule] = await Promise.all([
    loadRuntimePackage("lucide"),
    loadRuntimePackage("sharp"),
  ]);
  const resolvedName = iconNameCandidates(name).find((candidate) => lucide.icons?.[candidate] || lucide[candidate]);
  const icon = resolvedName ? lucide.icons?.[resolvedName] || lucide[resolvedName] : undefined;
  if (!icon) throw new Error(`Lucide icon not found: ${name}`);

  const inner = size - padding * 2;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${escapeXml(color)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
    background === "transparent" ? "" : `<rect width="24" height="24" rx="4" fill="${escapeXml(background)}" stroke="none"/>`,
    `<g transform="translate(${(padding / size) * 24} ${(padding / size) * 24}) scale(${inner / size})">`,
    icon.map(renderNode).join(""),
    "</g></svg>",
  ].join("");

  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharpModule.default(Buffer.from(svg)).png().toFile(output);
  console.log(JSON.stringify({ ok: true, name: resolvedName, output, size, color, background }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
