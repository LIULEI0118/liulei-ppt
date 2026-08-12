# LIULEI PPT GitHub Documentation Design

**Date:** 2026-08-12

**Status:** Approved for planning

## Goal

Turn the existing `liulei-ppt` skill folder into a complete public GitHub repository that is understandable to human users, remains efficient for Codex to load, and can be installed and validated from documented commands.

The repository will be published as `LIULEI0118/liulei-ppt`, use the MIT License, use `main` as its initial branch, and receive a `v1.0.0` tag after all checks pass.

## Design principles

1. Separate human documentation from agent instructions. Repository-level Markdown explains installation, capabilities, maintenance, and contribution. `SKILL.md` and `references/` continue to tell Codex how to perform presentation work.
2. Keep `SKILL.md` concise. Core routing and hard gates stay in `SKILL.md`; runtime details, layout field rules, and troubleshooting load only when relevant.
3. Avoid duplicated sources of truth. README content stays introductory and links to detailed documents. Command flags and runtime behavior are documented once and linked from other pages.
4. Preserve compatibility. Existing `scripts/`, `assets/`, `references/`, `agents/`, and their relative paths stay in place.
5. Document only verified behavior. Installation syntax, script commands, runtime paths, expected outputs, and failure messages must be confirmed against the local CLI or source before publication.

## Repository structure

### Human-facing entry points

- `README.md` introduces the skill, shows the six approved style montages, explains the main capabilities and workflow, provides a verified quick start, and links to detailed documentation.
- `LICENSE` contains the MIT License with copyright year 2026 and owner name `LIULEI`.
- `CONTRIBUTING.md` explains how to change instructions, references, scripts, style kits, and examples; it also lists required validation commands.
- `.gitignore` excludes generated previews, output decks, temporary QA reports, dependency folders, and operating-system metadata without excluding bundled approved assets.

### Human documentation

- `docs/getting-started.md` covers prerequisites, installation, activation prompts, first use, input types, and the outline-approval gate.
- `docs/workflows.md` documents the three supported workflows: built-in styles, strict template reuse, and style extraction/redraw. Each workflow specifies inputs, decisions, outputs, and verification.
- `docs/command-reference.md` documents every bundled executable script, its required and optional flags, outputs, exit behavior, and one verified example.
- `docs/troubleshooting.md` maps known errors to checks and remedies, including missing runtime packages, invalid content plans, unapproved plans, missing assets, invalid style kits, template-tool availability, render failures, and QA failures.

### Agent-facing documentation

- `SKILL.md` gains a short preflight section, runtime-reference routing, explicit working-path conventions, and clearer failure behavior. The narrative, style-selection, outline-approval, authoring, and QA gates remain authoritative.
- `references/runtime.md` explains the Codex runtime dependency model, default resolution paths, the `CODEX_ARTIFACT_TOOL_PATH` override, required system commands, temporary/final path conventions, and when to stop versus retry.
- `references/content-plan.md` gains a layout selection table, layout-specific field requirements, relative asset resolution rules, source registry rules, approval semantics, and links to the bundled example plans.
- `references/qa.md` gains `--expected-count` usage, report interpretation, automated versus visual gates, and an explicit delivery decision.

No existing script, style profile, approved sample deck, preview montage, schema, or example asset is moved or renamed.

## Information flow

The human path is:

`README.md` → `docs/getting-started.md` → `docs/workflows.md` → `docs/command-reference.md` or `docs/troubleshooting.md`

The agent path is:

`SKILL.md` → request routing → conditional `references/*.md` → structured content plan → bundled script → rendered previews and QA report → editable PPTX

The content plan remains the boundary between narrative planning and slide generation. User approval is recorded with `approved: true`; unapproved execution is allowed only when the user explicitly waives the gate and the agent passes `--allow-unapproved`.

## Runtime and path rules

- Resolve the skill root once as `SKILL_DIR` and invoke bundled scripts with absolute paths.
- Put intermediate plans, generated images, renders, layout JSON, reports, and source notes under a task-specific temporary directory.
- Put only the requested final PPTX in the final output path unless the user asks for supporting artifacts.
- Resolve relative `imagePath` and `iconPath` entries from the directory containing the content-plan JSON, matching `build-deck.mjs` behavior.
- Use the bundled Codex primary runtime for `@oai/artifact-tool` and `sharp`. Document the artifact-tool override supported by the implementation; do not claim an unsupported general runtime override.
- Treat a missing template helper as a strict-template workflow blocker. Do not silently switch to redraw mode.

## Error handling

Documentation must distinguish four classes of failure:

1. Input or approval failures: request the missing user decision or correct the plan.
2. Validation failures: fix schema, source references, style-kit structure, or missing assets before generation.
3. Runtime failures: verify Node, the Codex primary runtime, required system commands, and the supported artifact-tool override.
4. Visual QA failures: inspect rendered slides, repair the deck, and rerun QA; never deliver a technically exported but visually failed deck.

Commands must be written so a nonzero exit status blocks the next stage. Troubleshooting guidance must preserve source files and recommend distinct output paths rather than overwriting inputs.

## Validation strategy

Run checks in increasing cost order:

1. Validate the skill folder with the system `quick_validate.py` utility.
2. Verify all relative Markdown links and referenced local files.
3. Run `node scripts/validate-style-kit.mjs` for all six bundled styles.
4. Run `node scripts/validate-plan.mjs` against `assets/examples/sample-plan.json` and `assets/examples/full-layout-plan.json`.
5. Build a PPTX from the sample plan with a bundled style and render previews.
6. Run `node scripts/qa-deck.mjs` with the expected slide count and confirm `ok: true`.
7. Inspect the generated montage to confirm the documented end-to-end workflow produces a readable deck.
8. Re-run documentation link checks and `git diff --check` immediately before publication.

Generated validation artifacts stay outside the repository or in ignored output paths.

## GitHub publication

1. Re-authenticate the GitHub CLI as `LIULEI0118` before making remote changes.
2. Initialize the local repository with `main` if it has not already been initialized.
3. Commit the approved specification separately from implementation changes so the design decision is reviewable.
4. Commit the complete documentation and validation changes with an intentional, concise message.
5. Create the public repository `LIULEI0118/liulei-ppt`, add it as `origin`, and push `main`.
6. Verify the remote repository URL and default branch.
7. Create and push annotated tag `v1.0.0` only after the pushed commit matches the validated local commit.

Because this is the initial publication of a new empty repository, the validated initial history is pushed directly to `main`; there is no meaningful pre-existing base branch for a draft pull request.

## Acceptance criteria

- A new user can understand what the skill does, see the available visual systems, install it with a verified command, and run a first request from the README and getting-started guide.
- A maintainer can find every script flag, expected output, validation command, and contribution rule without reading script source.
- Codex can follow `SKILL.md` without loading repository-level documentation into its working context.
- All existing asset and script paths still resolve.
- Skill, style-kit, example-plan, build, render, and QA checks pass.
- The public repository exists at `https://github.com/LIULEI0118/liulei-ppt`, its default branch is `main`, and tag `v1.0.0` points to the validated release commit.
