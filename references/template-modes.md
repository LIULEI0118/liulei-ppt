# Reference PPT modes

## Ask first

If a reference PPTX is supplied without a mode, ask the user to choose strict template reuse or style extraction and redraw.

## Strict template reuse

1. Run the bundled strict-template inspector and inspect every rendered slide and layout record:

   ```bash
   node "$SKILL_DIR/scripts/template-tool.mjs" \
     --action inspect \
     --workspace "$TMP_DIR" \
     --pptx "$REFERENCE_PPTX"
   ```

2. Create `template-frame-map.json`; every output slide must identify a source slide and inherited edit targets.
3. Validate the map and build the duplicated starter deck:

   ```bash
   node "$SKILL_DIR/scripts/template-tool.mjs" \
     --action validate \
     --workspace "$TMP_DIR" \
     --map "$TMP_DIR/template-frame-map.json"

   node "$SKILL_DIR/scripts/template-tool.mjs" \
     --action prepare \
     --workspace "$TMP_DIR" \
     --pptx "$REFERENCE_PPTX" \
     --map "$TMP_DIR/template-frame-map.json" \
     --out "$TMP_DIR/template-starter.pptx" \
     --preview-dir "$TMP_DIR/template-starter-preview" \
     --layout-dir "$TMP_DIR/template-starter-layout" \
     --contact-sheet "$TMP_DIR/template-starter-contact-sheet.png"
   ```

4. Edit inherited text, image, chart, table, footer, and page-number elements in place.
5. Preserve exact typography, spacing, alignment, chrome, master furniture, logos, and notes unless the user requests a change.
6. If new copy does not fit, shorten it, remap the slide, or split it. Do not silently shrink text.
7. If no source slide can support the content, stop and offer the closest source layout or redraw mode.

Before delivery, run `template-tool.mjs --action fidelity` with the starter/final PPTX, map, and layout directories.

Never overlay a parallel custom design on copied source slides and never fall back silently to redraw.

## Style extraction and redraw

Run `extract-style.mjs` over the complete source deck. Review its renders and refine the generated `style-profile.json` when needed. Rebuild new slides with that profile. Explain that this mode matches the design language rather than pixels.
