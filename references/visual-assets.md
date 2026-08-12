# Visual assets and icons

Use visuals only when they advance the slide claim.

## Choose a route

1. **User or official asset**: use for real products, people, places, logos, screenshots, and evidence.
2. **Lucide semantic icon**: use for simple concepts such as target, trend, shield, users, calendar, or workflow.
3. **Image generation**: use for bespoke illustrations, abstract cover art, icon families, textures, and conceptual visuals.
4. **Image search**: use for authentic real-world editorial photography when generation would create false evidence.

Never generate fake product UI, fake logos, fake people presented as real, or fake documentary evidence.

## Lucide icons

Create a consistent transparent PNG icon:

```bash
node "$SKILL_DIR/scripts/generate-icon.mjs" \
  --name target \
  --out "$TMP_DIR/assets/target.png" \
  --color "#1738B8" \
  --size 256 \
  --stroke-width 1.8
```

Use one stroke width and optical size across a deck. Do not mix filled, outlined, 3D, and hand-drawn icon families.

## Image-generated icon families

Use the imagegen skill and issue one generation call per distinct icon or visual. For simple transparent icons, generate on a flat chroma-key background and remove it with the installed imagegen helper.

Prompt skeleton:

```text
Use case: productivity-visual
Asset type: presentation icon
Primary request: <single concept>
Style/medium: <one coherent family, e.g. soft 3D clay or editorial paper-cut>
Composition/framing: centered object, generous padding, readable at small size
Color palette: match the selected LIULEI PPT style profile
Constraints: no text, no logo, no watermark, no cast shadow outside the object
Avoid: mixed styles, tiny details, generic sparkle symbols
```

Append the selected style profile's `assets.imagePromptStyle` verbatim as the visual-language clause. Respect its `assets.icons` rule; `editorial-premium`, for example, normally uses no icon family, while `fresh-creative` and `academic-report` benefit from custom coherent icon sets.

Save every selected project-bound image under `$TMP_DIR/assets/` or the requested project asset directory and reference it through `imagePath` or `iconPath` in the content plan.

## Slide use

- Use `hero-image` for a large focal image.
- Use `metric` with `iconPath` for one dominant number and one supporting idea.
- Use icons beside short labels, not as decoration in empty corners.
- Limit most slides to one primary visual asset.
