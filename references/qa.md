# Delivery QA

Run automated QA, then inspect every slide image at full size.

For a built-in style, validate the packaged profiles, samples, and previews first:

```bash
node "$SKILL_DIR/scripts/validate-style-kit.mjs"
```

## Automated gates

- PPTX exists, is non-empty, and imports through artifact-tool.
- Expected slide count matches the content plan when `--expected-count` is supplied.
- Every slide renders to PNG and layout JSON.
- Layout records contain no obvious negative coordinates or negative dimensions. Inspect right and bottom edges visually because the automated scan does not prove full in-canvas containment.
- No empty structural placeholder remains.
- No unresolved prompt text such as “Click to add”, “Title goes here”, “Slide Number”, “Date”, or “Footer” remains.
- Import, inspection, or render failure exits nonzero and may stop before a report is written.

Run deck QA with the approved slide count:

```bash
node "$SKILL_DIR/scripts/qa-deck.mjs" \
  --pptx "$FINAL_PPTX" \
  --report "$TMP_DIR/qa-report.json" \
  --preview-dir "$TMP_DIR/qa-preview" \
  --expected-count 10
```

`--pptx` and `--report` are required. `--preview-dir` defaults to `qa-preview` beside the report. `--expected-count` is optional but should always be supplied when the plan is known.

## Read the report

The JSON report contains:

- `ok`: whether the automated issue list is empty;
- `bytes` and `slideCount`: basic file and deck checks;
- `previewDir`: the folder containing slide PNGs, layout JSON, and `montage.png`;
- `issues`: detected position, placeholder, prompt, scan, or slide-count problems;
- `visualReviewRequired`: always `true` because automation does not judge composition or content truth;
- `generatedAt`: QA timestamp.

Common issue types are `invalid-position`, `empty-placeholder`, `placeholder-scan-failed`, `unresolved-template-prompt`, and `slide-count-mismatch`. Fix the cause, regenerate when necessary, and rerun QA. A zero exit status and `ok: true` pass only the automated stage.

## Visual gates

- One clear primary read per slide.
- No unintended overlap, clipping, or awkward title wrapping.
- Charts and tables agree with source data and remain editable.
- Images are correctly cropped and sourced.
- Spacing, page furniture, page numbers, and citations are consistent.
- The montage shows a coherent pace and varied but related slide silhouettes.
- The montage visibly belongs to the selected approved style and cannot be converted into another style by palette swapping alone.
- Fonts render as intended on the current system; inspect substitutions visually because the script does not perform a separate font inventory check.
- Every chart, table, metric, citation, and image agrees with its source. QA cannot establish factual correctness automatically.

## Failure behavior

Do not deliver on a failed gate. Delivery requires all of the following:

1. the QA command exits successfully;
2. the report contains `ok: true`;
3. every rendered slide has been inspected at full size;
4. the montage passes deck-level rhythm and selected-style comparison;
5. source data, citations, images, notes, and editability have been checked where applicable.

Fix the deck and rerun QA after any failure. For strict templates, do not replace fidelity failures with a redraw unless the user switches modes.
