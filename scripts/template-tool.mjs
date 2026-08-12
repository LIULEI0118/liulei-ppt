#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { makeMontage, parseArgs, requireArg } from "./runtime.mjs";

const actionScripts = {
  inspect: "inspect_template_deck.mjs",
  validate: "validate_template_plan.mjs",
  prepare: "prepare_template_starter_deck.mjs",
  fidelity: "check_template_fidelity.mjs",
};

async function findDelegate(scriptName) {
  const root = path.join(os.homedir(), ".codex", "plugins", "cache", "openai-primary-runtime", "presentations");
  const versions = (await fs.readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const version of versions) {
    const candidate = path.join(root, version, "skills", "presentations", "template_following_scripts", scriptName);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next installed presentation runtime.
    }
  }
  throw new Error(`Bundled presentation template tool not found: ${scriptName}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const action = requireArg(args, "action");
  const scriptName = actionScripts[action];
  if (!scriptName) throw new Error(`Unsupported action ${action}; choose ${Object.keys(actionScripts).join(", ")}`);
  const delegate = await findDelegate(scriptName);
  const forwarded = [];
  const contactSheet = action === "prepare" && typeof args["contact-sheet"] === "string"
    ? path.resolve(args["contact-sheet"])
    : undefined;
  for (const [key, value] of Object.entries(args)) {
    if (key === "action") continue;
    if (key === "contact-sheet" && contactSheet) continue;
    forwarded.push(`--${key}`);
    if (value !== true) forwarded.push(String(value));
  }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [delegate, ...forwarded], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${scriptName} exited with ${code}`)));
  });
  if (contactSheet) {
    const previewDir = path.resolve(requireArg(args, "preview-dir"));
    const renders = (await fs.readdir(previewDir))
      .filter((name) => /(?:^|-)slide-\d+\.png$/i.test(name))
      .sort()
      .map((name) => path.join(previewDir, name));
    if (!renders.length) throw new Error(`No slide PNGs found for contact sheet: ${previewDir}`);
    await makeMontage(renders, contactSheet);
    console.log(contactSheet);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
