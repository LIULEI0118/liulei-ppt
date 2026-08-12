---
name: liulei-ppt
description: Create, restyle, extend, or improve editable PowerPoint (.pptx) decks from text, Markdown, TXT, DOCX, PDF, XLSX, CSV, images, or an existing/reference PPTX. Use when a user asks for a presentation, slide deck, PPT/PPTX, outline-to-slides workflow, a built-in presentation style, strict reuse of an uploaded template, extraction of a reference deck's visual language, editable charts or tables, speaker notes, or slide-level rendering and QA.
---

# LIULEI PPT

Create coherent, audience-ready presentations and deliver a verified editable `.pptx`. Always plan the narrative first and obtain explicit outline approval before authoring unless the user explicitly asks to skip approval.

## Prepare the workspace

1. Resolve this skill folder to an absolute `SKILL_DIR` before invoking a bundled script.
2. Create a task-specific `TMP_DIR` for content plans, generated assets, renders, layout records, QA reports, and source notes.
3. Resolve `FINAL_PPTX` to the requested destination or the default output path. Never use an input PPTX as the output path.
4. Before the first build, strict-template operation, or runtime retry, read `references/runtime.md` and complete its preflight checks.
5. Stop on a nonzero script exit. Fix the reported input, dependency, or QA failure before advancing to the next stage.

## Route the request

1. Choose the output path before authoring. Use the user's destination; otherwise use `$PWD/outputs/<topic-slug>.pptx`.
2. Preserve every input file. For an edit, write a distinct output file.
3. Route inputs:
   - TXT/Markdown: read directly.
   - DOCX: use the documents skill.
   - PDF: use the PDF skill.
   - XLSX/CSV: use the spreadsheets skill and compute before designing.
   - Images: inspect them; use only verified or user-provided assets.
   - PPTX: inspect the complete deck with the presentation tooling.
4. If a reference PPTX is present and the user has not selected a mode, ask them to choose strict template reuse or style extraction and redraw.
5. If there is no reference deck, use one built-in style from `assets/styles/`. Default to `business-minimal` only after showing the available styles.

List the selectable styles and their preview files with:

```bash
node "$SKILL_DIR/scripts/list-styles.mjs"
```

Show the user the resolved preview montage, not only the style name. Once a style is selected, inspect its montage and sample PPTX and read only that style's section in `references/style-recipes.md`. The approved sample is the visual acceptance target; the JSON profile alone is not enough.

Resolve the selected style's complete brief with:

```bash
node "$SKILL_DIR/scripts/style-brief.mjs" --style fresh-creative
```

## Establish the communication job

Determine the audience, job of the deck, desired audience outcome, central takeaway, source constraints, language, aspect ratio, and expected length. Defaults:

- Match the input language.
- Use 16:9.
- Suggest 8–12 slides when length is unspecified.
- Use only supplied material unless research is explicitly requested or required to fill a clearly identified gap.
- Never invent facts, data, people, quotes, sources, or outcomes.

Express the job internally as: “By the end, [audience] should [outcome] because [central takeaway].”

Read `references/content-plan.md` before creating the outline or content-plan JSON.

## Obtain outline approval

Present a concise outline containing the communication job and, for every slide: takeaway title, narrative role, key evidence/content, intended layout, visual direction, and source references. Wait for explicit approval before generating the deck. If the user asks for immediate generation, record that the approval gate was waived and continue.

Use one primary claim per slide. Open with the reason the deck matters, build a cumulative arc, and close by resolving the opening rather than using a generic “Thank you” slide.

## Author the deck

Use JavaScript ES modules and `@oai/artifact-tool`. Do not use `python-pptx`.

For a built-in style or extracted style:

1. Read `references/style-system.md`.
2. For a built-in style, inspect its approved montage and sample deck from `assets/styles/catalog.json`, then read its recipe in `references/style-recipes.md`.
3. Read `references/visual-assets.md`. Read `references/visual-research.md` only when provenance or further research is needed.
4. Create a structured JSON content plan matching `references/content-plan.schema.json`. Include a page silhouette and concrete visual brief for every slide.
5. Validate it:

```bash
node "$SKILL_DIR/scripts/validate-plan.mjs" --plan "$TMP_DIR/content-plan.json"
```

6. Generate the required hero images or icon family before laying out the deck. Use the imagegen skill for bespoke raster visuals and `scripts/generate-icon.mjs` for deterministic Lucide icons.
7. Generate and render:

```bash
node "$SKILL_DIR/scripts/build-deck.mjs" \
  --plan "$TMP_DIR/content-plan.json" \
  --style business-minimal \
  --out "$FINAL_PPTX" \
  --preview-dir "$TMP_DIR/final-preview"
```

For style extraction:

```bash
node "$SKILL_DIR/scripts/extract-style.mjs" \
  --pptx "$REFERENCE_PPTX" \
  --out "$TMP_DIR/style-profile.json" \
  --preview-dir "$TMP_DIR/reference-preview"
```

Pass the resulting JSON path to `--style`.

`build-deck.mjs` is the reliable baseline for standard layouts. When the approved sample uses a composition that the baseline renderer cannot express, author that slide directly with `@oai/artifact-tool` while preserving the selected recipe, editable text, native data objects, and the same QA workflow. Never accept a generic baseline page merely because it validates technically.

For strict template reuse, read `references/template-modes.md`. Inspect every source slide, create a source-to-output frame map, duplicate mapped source slides, and edit inherited objects in place. Do not approximate a failed strict-template import with a redraw.

Treat relative `imagePath` and `iconPath` values as relative to the content-plan JSON. Keep generated assets beside that plan or use absolute paths. Supported raster inputs are PNG, JPEG, and WebP.

## Visual and content rules

- Use audience-facing copy only; never expose planning instructions on slides.
- Treat a style as a composition system, not a palette. Vary hierarchy, grid, media scale, chart emphasis, and page silhouette by style.
- Match at least three recognizable page silhouettes from the selected style recipe across a normal 8–12 slide deck.
- Assign a visual strategy to every slide. Prefer `hero-image`, `metric`, `quote`, `timeline`, native chart/table, or a meaningful diagram when those forms communicate faster than prose.
- Aim for meaningful visual form on roughly 50–70% of slides; this includes data, typography-led metrics, timelines, diagrams, and images—not decorative filler.
- Do not repeat the same layout more than twice consecutively. Alternate dense and sparse pages to create rhythm.
- Prefer takeaway titles. Keep deck titles at least 50 pt, slide titles 35 pt, subheads 24 pt, and body text 16 pt unless a source template dictates exact sizes.
- Shorten content or change layout before reducing type.
- Use native editable charts and tables for data.
- Use simple native shapes only for layout structure and simple diagrams. Use verified raster assets or image generation for substantive visuals.
- Generate deterministic interface/business icons from one Lucide family with `scripts/generate-icon.mjs`. Use the image-generation skill for bespoke icon families, hero illustrations, or visual metaphors; record the prompt and keep generated assets in the task temp directory.
- Keep image-generation prompts style-specific by using the selected profile's `assets.imagePromptStyle`. Generate one asset per call and inspect it before use.
- Do not reuse the same foreground image on multiple slides.
- Add speaker notes only when requested; preserve imported notes unless asked to change them.
- Put citations in compact slide footers or a sources slide. Keep detailed provenance in `$TMP_DIR/source-notes.txt`.

## Verify before delivery

Read `references/qa.md`, then run:

```bash
node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$FINAL_PPTX" \
  --report "$TMP_DIR/qa-report.json" \
  --preview-dir "$TMP_DIR/qa-preview"
```

Inspect every rendered slide at full size and the montage for deck-level flow. Fix clipping, unintended overlap, wrapping, broken assets, chart/data mismatch, unresolved placeholders, and inconsistent page furniture. Deliver only after QA passes.

Compare the final montage against the approved montage for the selected style. Fail the visual review if the result could be converted into another built-in style by changing only colors, or if the recipe's media scale, typography, grid, and page silhouettes are absent.

If strict-template tooling is unavailable, stop and report that strict reuse is blocked; do not switch modes without approval. If an asset is missing, repair the plan or asset path rather than removing the intended visual. A technically valid QA report never replaces inspection of every rendered slide and the montage.

Return one standalone Markdown link to the final PPTX and briefly state the chosen style, slide count, and whether external sources were used.
