import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) throw new Error(`Unexpected argument: ${raw}`);
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function requireArg(args, key) {
  const value = args[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
}

export async function writeJson(filePath, value) {
  const target = path.resolve(filePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function saveBlob(filePath, blob) {
  const target = path.resolve(filePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await blob.arrayBuffer()));
}

function artifactEntrypoint() {
  const override = process.env.CODEX_ARTIFACT_TOOL_PATH;
  const packageDir = override
    ? path.resolve(override)
    : path.join(
        os.homedir(),
        ".cache",
        "codex-runtimes",
        "codex-primary-runtime",
        "dependencies",
        "node",
        "node_modules",
        "@oai",
        "artifact-tool",
      );
  const candidates = [
    path.join(packageDir, "dist", "node", "artifact_tool.mjs"),
    path.join(packageDir, "dist", "artifact_tool.mjs"),
  ];
  const entrypoint = candidates.find((candidate) => fsSync.existsSync(candidate));
  if (!entrypoint) {
    throw new Error(
      `@oai/artifact-tool was not found. Set CODEX_ARTIFACT_TOOL_PATH to its package directory. Checked: ${candidates.join(", ")}`,
    );
  }
  return entrypoint;
}

export async function loadArtifactTool() {
  return import(pathToFileURL(artifactEntrypoint()).href);
}

function runtimeNodeModules() {
  return path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
  );
}

export async function loadRuntimePackage(packageName) {
  const resolver = createRequire(path.join(runtimeNodeModules(), "__liulei_ppt_resolver__.cjs"));
  return import(pathToFileURL(resolver.resolve(packageName)).href);
}

export async function makeMontage(imagePaths, outputPath, options = {}) {
  const { default: sharp } = await loadRuntimePackage("sharp");
  const columns = options.columns || 2;
  const cellWidth = options.cellWidth || 480;
  const gap = options.gap || 18;
  const prepared = [];
  let cellHeight = 0;
  for (const imagePath of imagePaths) {
    const buffer = await sharp(imagePath).resize({ width: cellWidth }).png().toBuffer();
    const metadata = await sharp(buffer).metadata();
    cellHeight = Math.max(cellHeight, metadata.height || 270);
    prepared.push({ buffer, width: metadata.width || cellWidth, height: metadata.height || 270 });
  }
  const rows = Math.ceil(prepared.length / columns);
  const width = columns * cellWidth + (columns + 1) * gap;
  const height = rows * cellHeight + (rows + 1) * gap;
  const composite = prepared.map((image, index) => ({
    input: image.buffer,
    left: gap + (index % columns) * (cellWidth + gap),
    top: gap + Math.floor(index / columns) * (cellHeight + gap),
  }));
  const target = path.resolve(outputPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: options.background || "#E5E7EB",
    },
  }).composite(composite).png().toFile(target);
  return target;
}

export function skillDirFromScript(importMetaUrl) {
  return path.resolve(path.dirname(new URL(importMetaUrl).pathname), "..");
}

export function countItems(collection) {
  if (Array.isArray(collection?.items)) return collection.items.length;
  if (Number.isInteger(collection?.length)) return collection.length;
  return 0;
}
