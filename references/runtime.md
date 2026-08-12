# Runtime and workspace

Read this file before the first build, strict-template operation, or retry after a runtime error.

## Preflight

The bundled scripts are Node.js ES modules. Confirm that `node` is available. `qa-deck.mjs` also calls `unzip` to inspect slide XML.

```bash
command -v node
node --version
command -v unzip
```

The build, inspection, extraction, and QA scripts load `@oai/artifact-tool` from the Codex primary runtime. Icon generation and montage assembly load `lucide` and `sharp` from the same runtime. They are not declared as repository-local npm dependencies.

By default, `scripts/runtime.mjs` resolves the primary runtime below the current user's home directory:

```text
.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/
```

If `@oai/artifact-tool` is installed in another package directory, set `CODEX_ARTIFACT_TOOL_PATH` to the directory containing either `dist/node/artifact_tool.mjs` or `dist/artifact_tool.mjs`:

```bash
export CODEX_ARTIFACT_TOOL_PATH="/absolute/path/to/node_modules/@oai/artifact-tool"
```

This override applies only to `@oai/artifact-tool`. `sharp` and `lucide` still resolve from the Codex primary runtime.

Strict-template actions delegate to helper scripts bundled with an installed Codex presentations runtime under `.codex/plugins/cache/openai-primary-runtime/presentations/`. A missing helper blocks strict reuse; do not fall back to redraw without user approval.

## Working paths

Use absolute paths for script entry points and final outputs:

```bash
SKILL_DIR="/absolute/path/to/liulei-ppt"
TMP_DIR="$(mktemp -d)"
FINAL_PPTX="$PWD/outputs/topic.pptx"
```

Keep these in `TMP_DIR`:

- the content-plan JSON;
- generated or downloaded task assets;
- source notes and prompts;
- slide PNGs and layout JSON;
- montages and QA reports;
- strict-template inspection and frame-map artifacts.

Keep the requested final PPTX at `FINAL_PPTX`. Preserve every source file and use a distinct output filename for edits.

`build-deck.mjs` resolves relative `imagePath` and `iconPath` values from the directory containing the content-plan JSON. It accepts `.png`, `.jpg`, `.jpeg`, and `.webp` files. Put task assets beside the plan or use absolute paths.

## Runtime-dependent commands

These commands require `@oai/artifact-tool`:

- `build-deck.mjs`
- `extract-style.mjs`
- `inspect-template.mjs`
- `qa-deck.mjs`

`generate-icon.mjs` requires `lucide` and `sharp`. `list-styles.mjs`, `style-brief.mjs`, `validate-plan.mjs`, and `validate-style-kit.mjs` do not import artifact-tool. `template-tool.mjs` requires the presentations runtime helpers for its selected action and uses `sharp` only when assembling a requested contact sheet.

## Failure handling

- `@oai/artifact-tool was not found`: verify the Codex primary runtime or set the supported artifact-tool override.
- `Cannot find module` for `sharp` or `lucide`: repair or load the Codex primary runtime; the artifact-tool override does not change their resolver.
- `Bundled presentation template tool not found`: install or restore the presentations runtime, or ask the user to switch modes.
- `Image asset not found`: resolve the path from the plan directory and restore the intended asset.
- `Unsupported image type`: convert the asset to PNG, JPEG, or WebP.
- Import, export, or render error: preserve the input, write to a new output path, inspect the reported file, and retry only after correcting the cause.
- Any nonzero exit: stop the pipeline. Do not deliver a partial or unverified deck.
