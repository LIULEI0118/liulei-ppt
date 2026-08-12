# Content planning

Before authoring, define the audience, deck job, desired audience outcome, central takeaway, source constraints, language, aspect ratio, length, style, and notes preference.

Use a cumulative narrative such as context → stakes → evidence → implications → action, question → analysis → answer, or current state → change → future state.

## Outline approval format

Show the communication job followed by a table with:

1. slide number;
2. takeaway title;
3. narrative role;
4. key content or evidence;
5. layout;
6. visual direction;
7. source references.

Wait for explicit approval unless the user waived it.

## JSON boundary

Write the approved plan as JSON matching `content-plan.schema.json`. Use these required top-level fields:

| Field | Rule |
| --- | --- |
| `title` | Non-empty deck title. |
| `audience` | Specific intended audience. |
| `goal` | Desired audience outcome and central takeaway. |
| `language` | Output language or a clear value such as `zh-CN`. |
| `aspectRatio` | Exactly `16:9` or `4:3`. |
| `slides` | One or more slide objects. |

Use `subtitle`, `approved`, and `sources` when needed. Set `approved: true` only after explicit outline approval. If the user explicitly waived approval, keep that decision in the task record and pass `--allow-unapproved`; do not mislabel the plan as approved.

Each slide requires `title`, `role`, and `layout`. Also include `silhouette` and `visualBrief` as planning metadata so visual intent survives into authoring, even though the baseline renderer does not draw those strings. Use `assetPrompt` to retain an image-generation brief and `notes` for speaker notes.

## Choose a layout

| Layout | Required or primary fields | Use |
| --- | --- | --- |
| `title` | `title`; optional `eyebrow`, `body`, `imagePath`, `imageAlt` | Opening page. Some style-specific title compositions use an image. |
| `section` | `title`; optional `body` | Deliberate chapter transition. |
| `statement` | `title`; optional `eyebrow`, `body` | One centered thesis or implication. |
| `bullets` | `title`; `bullets` or newline-delimited `body` | Ordered explanation with at most six rendered items. |
| `two-column` | `title`, `leftTitle`, `leftBody`, `rightTitle`, `rightBody` | Comparison or paired argument. |
| `chart` | `title`, `chart.categories`, `chart.series` | Editable bar, line, pie, or doughnut evidence. Every series needs one value per category. |
| `table` | `title`, `table.values` | Editable rectangular matrix with a header and at least one data row. |
| `hero-image` | `title`, `imagePath`; optional `imageAlt`, `imagePosition`, `body` | Large focal raster image. `imagePosition` is `left`, `right`, or `full`. |
| `metric` | `title`, `metricValue`; optional `metricLabel`, `iconPath`, `body` | One dominant number and its meaning. |
| `quote` | `title`, `quote`; optional `attribution`, `body` | Typography-led quotation or principle. |
| `timeline` | `title`, `steps` | Two to five stages. Each step requires `title` and may include `label` and `body`. |
| `closing` | `title`; optional `eyebrow`, `body` | Resolve the opening and state the conclusion or action. |

The baseline renderer supports only these 12 layout identifiers. When a composition cannot be expressed by them, author the approved slide directly with `@oai/artifact-tool` while preserving the plan, style recipe, editability, and QA gates.

## Assets and sources

- Resolve relative `imagePath` and `iconPath` values from the directory containing the plan JSON.
- Use PNG, JPEG, or WebP. Give meaningful `imageAlt` text.
- Store generated assets in the task workspace, normally beside the plan under an `assets/` directory.
- Register every evidence source in top-level `sources` with a stable `id` and `label`; add `url` when available.
- Put only registered IDs in slide-level `sourceRefs`. The footer renders IDs, so choose compact, readable identifiers.
- Keep complete source details in the registry and task source notes. Never invent an ID or citation to make validation pass.

## Content plan rules

- Give each slide one narrative job and one primary claim.
- Use concrete, audience-facing titles.
- Connect evidence to meaning and implication.
- Never invent facts, metrics, citations, people, quotes, or outcomes.
- Keep source identifiers stable between outline and final deck.
- Store generated plans as `.json`; store prose notes as `.txt`.

## Validate before building

```bash
node "$SKILL_DIR/scripts/validate-plan.mjs" \
  --plan "$TMP_DIR/content-plan.json"
```

A successful result contains `"ok": true` and the slide count. Validation does not constitute approval and does not verify visual quality.

Use `assets/examples/sample-plan.json` for a compact end-to-end example and `assets/examples/full-layout-plan.json` for coverage of the standard content layouts.
