# Style system

A style profile controls composition before decoration. Its `composition` block defines the grid, title behavior, media treatment, information density, intended dominant-element scale, and approved page silhouettes. Its `assets` block defines photography, icon, and image-generation language. Do not produce six decks with the same boxes and merely swap colors.

Use page silhouettes deliberately:

- `hero-image`: one large verified/generated image with an asymmetric text field.
- `metric`: one dominant number, one label, and at most one supporting sentence.
- `quote`: typography-led pull quote with a compact attribution.
- `timeline`: two to five stages with connectors placed behind nodes.
- `chart` / `table`: editable evidence with one emphasized insight.

Across a deck, alternate sparse and dense slides, avoid repeating a layout more than twice, and let one element occupy roughly 45–70% of the usable canvas when it carries the slide’s main meaning.

Built-in styles live in `assets/styles/<id>.json`.
Their approved sample decks and montages are resolved through `assets/styles/catalog.json`. Inspect both before authoring; use `references/style-recipes.md` for the selected style's detailed rules.

| ID | Use |
| --- | --- |
| `business-minimal` | Executive updates, proposals, general business |
| `consulting-data` | Analysis, recommendations, data-heavy decisions |
| `tech-dark` | Technology, AI, product and engineering narratives |
| `fresh-creative` | Brand, marketing, workshops and ideation |
| `academic-report` | Research, education and formal reports |
| `editorial-premium` | Thought leadership, launches and high-end storytelling |

Each profile defines colors, fonts, type scale, margins, gutter, chart and table treatment, decorative motif, media language, icon language, generation prompt style, approved page silhouettes, and an explicit avoid list.

Use an uploaded extracted profile by passing its JSON path to `build-deck.mjs --style`.

Do not reduce a style to palette swapping. Preserve its type hierarchy, whitespace, chart treatment, image treatment, density, and decorative rhythm.
