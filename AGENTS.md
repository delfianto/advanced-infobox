# AGENTS.md — Advanced Infobox

Obsidian plugin that renders wiki-style infoboxes from a note's **plain, flat
frontmatter**. This file orients an agent working in the repo; `CLAUDE.md` is a
symlink to it.

## The one rule

**Data lives in flat frontmatter; presentation lives elsewhere** (settings, CSS
variables, template notes, per-note block options). Breaking any presentation
config must never lose data. Every design decision follows from this — no nested
`infobox:` object, no hand-parsed pseudo-YAML block that duplicates properties.
The infobox is always downstream of the frontmatter. See the
[research notes](docs/research-notes.md) for the research and rationale behind it.

## Architecture

Data flow: `metadataCache` frontmatter → `buildViewModel` → a reactive
`InfoboxModel` → Svelte. An inline edit writes back via
`fileManager.processFrontMatter`, which fires `metadataCache."changed"` and
refreshes the box (guarded against a mid-edit teardown by an edit-depth latch).

- **`src/model/`** — pure logic, **must not import `obsidian`** (keeps it
  unit-testable; see Testing). No DOM, no runtime.
  - `values.ts` — classify a raw frontmatter value (`classifyValue`), prettify a
    key, normalize tags.
  - `schema.ts` — `buildViewModel(frontmatter, settings, blockConfig, template)`
    → the renderable `InfoboxViewModel` (header + wiki sections). Structure
    precedence: block sections › template body sections › template order ›
    zero-config.
  - `template.ts` — `parseTemplate` (a template note's frontmatter labels + body
    heading/list-item sections → `InfoboxTemplate`).
  - `template-registry.ts` — resolves template notes from the template folder,
    cached, invalidated on vault/metadata events.
  - `block-config.ts` — parses the ` ```infobox ` block's YAML options →
    `BlockConfig` (+ friendly error strings).
  - `edit.ts` — pure gates for inline editing (`isEditableValue`, `isDateOnly`,
    `parseNumberInput`, `coerceScalar`, `listItemText`).
  - `base-config.ts` — `buildBaseConfig`: a folder + template → a typed Obsidian
    Base (`.base`) config (table + cards views).
  - `sample-templates.ts` — starter template notes, bundled from
    `src/templates/*.md` via vite `?raw`.
- **`src/view/`** — Svelte + Obsidian runtime.
  - `InfoboxRenderChild.ts` — the orchestrator (a `MarkdownRenderChild`): mounts
    `Infobox.svelte`, renders each cell's markdown, resolves images/dates, owns
    the edit-latch and the `rendered` promise the code-block processor awaits so
    **PDF export** serializes a full box. Reusable standalone (the Bases hover
    popover instantiates one directly).
  - `Infobox.svelte` / `infobox-state.svelte.ts` — the card UI and its reactive
    model; inline editors live at the field-row level. `ListEditor.svelte` edits
    list values. `markdown.ts` renders a cell's markdown (a promise per cell).
  - `bases-hover.ts` — `BasesHoverPreview`: hover a note link in a Base → its
    infobox in a popover (best-effort; reads `.bases-view [data-href]`).
  - `TemplatePickerModal.ts` — fuzzy template picker for the insert commands.
- **`src/settings/`** — `settings.ts` (the `InfoboxSettings` type + `DEFAULT_SETTINGS`
  + parsers), `SettingsTab.ts` (the UI), `folder-suggest.ts`.
- **`src/main.ts`** — plugin entry. Registers the async ` ```infobox ` code-block
  processor, the commands, vault/metadata events (template invalidation +
  debounced refresh), the Bases hover, and writes changed settings as body-level
  `--aib-*` CSS variables.
- **`src/styles.css`** — the `--aib-*` CSS-variable API and the Style Settings
  `@settings` manifest. **`src/templates/*.md`** — the bundled starters.

## Build, test, and gates

`bun` + **vite-plus** (`vp`). The full local gate mirrors CI
(`.github/workflows/unit-tests.yml`) — run all four before considering work done:

```bash
bun run check       # vp fmt --check  +  vp lint     (the -c flags are LOAD-BEARING)
bun run type-check  # tsc --noEmit    +  svelte-check
bun run test        # vitest (via vp)
bun run build       # vp build → dist/{main.js,styles.css,manifest.json}
```

Also: `bun run dev` (watch build into `test-vault`), `bun run format` (fmt write),
`bun run lint:fix` (fixes some lint, **not** `sort-imports`).

> `vp lint`/`vp fmt` do **not** auto-discover `.oxlintrc.json`/`.oxfmtrc.json`;
> the `-c` flags in `package.json` scripts are required — keep them.

## Conventions

Strict TypeScript; **`.oxlintrc.json` is the source of truth** and documents every
deliberate deviation — read it. The oxlint gate is strict (all categories `error`
+ unicorn/oxc/import/promise). The rules an agent reliably trips over:

- **`sort-imports`** (not auto-fixed): declarations ordered by syntax group
  (none → all → multiple → single), then by **first-member name, case-insensitive**;
  members sorted within a declaration. So a single-member `import` sorts *after*
  all multi-member ones, and among singles `basesHover` precedes `Infobox`.
- Inline `type` specifiers (`import { type Foo, bar }`), one import line per module.
- No inline comments (put them on their own line); destructure member access
  (`const { top } = a`); `globalThis` not `window`; no nested ternaries; braces on
  wrapped `if`s; `.map((x) => f(x))` not `.map(f)`; `el.dataset.href` not
  `getAttribute`.

Run `bun run check` early and often. Files are PascalCase for components/Obsidian
classes, kebab-case otherwise.

## Testing

- **Pure logic → vitest.** `test/**` covers `model/` + `settings/`.
  `vitest.config.ts` aliases `obsidian` → `test/__mocks__/obsidian.ts` (a minimal
  runtime stub). **But `tsc` has no such alias** (`tsconfig.json` `"*": ["./*"]`),
  so it type-checks against the **real** `obsidian` types. Consequence: keep
  `model/` free of `obsidian` imports, and where a test needs a real value (e.g.
  `TFile`) construct a mock instance and cast the app `as unknown as App`.
- **View + integration → drive real Obsidian over CDP.** vitest can't render the
  Svelte/Obsidian view, so verify it live:
  1. Launch Obsidian with the debug port and the repo vault open:
     `open -a Obsidian --args --remote-debugging-port=9222` (then open
     `test-vault`).
  2. Deploy the build:
     `cp dist/main.js dist/styles.css manifest.json test-vault/.obsidian/plugins/advanced-infobox/`.
  3. Write a `playwright-core` script; **run it under `node` from the repo root**
     (copy the `.mjs` to root, run, delete it — ESM resolves `node_modules` from
     the script's dir). Connect with
     `chromium.connectOverCDP("http://127.0.0.1:9222")`, find the page whose
     `app.vault.adapter.basePath` contains `advanced-infobox/test-vault`, reload
     the plugin via `app.plugins.disablePlugin/enablePlugin("advanced-infobox")`,
     drive/`page.screenshot`, and view the PNG with the Read tool.
  - Blocked over the Electron socket: `Page.printToPDF` and the `Browser` domain.
    Don't call `browser.close()` (it can drop the debug port) — `process.exit(0)`.
    For a tall card, un-clip the scroller or set a tall
    `Emulation.setDeviceMetricsOverride` viewport and **clear it afterward**.

`test-vault/` is the demo/fixture vault: a 12-character D&D roster under
`Characters/`, the `dnd` template, and a generated `Characters.base`.

## Releasing

Distribution is private (BRAT), no community-store submission. To ship a release,
bump the version in **`manifest.json` + `versions.json` + `package.json`**, commit
`Release X.Y.Z`, and push to `main`. `.github/workflows/release.yml` builds from
source and publishes (main.js/manifest.json/styles.css) **iff** that version has
no release yet — so a push without a version bump is a safe no-op. Never push a
red `main`: the release builds from `HEAD`, and CI runs the full gate.

Commit/push only when the user asks. Keep `main` green.

## Gotchas

- Build constants `__BUILD_TIME__` / `__DEV_BUILD__` are read defensively
  (`typeof` guards) — vite-plus has dropped the `define` replacement on an
  incremental rebuild before. Dev builds toast their build time; a stale toast
  means restart `bun run dev`.
- Wikilinks in YAML must be quoted: `image: "[[cover.png]]"`.
- The volatile `test-vault/.obsidian/*` state (workspace, app/appearance,
  core-plugins) and the deployed plugin build are gitignored; the
  community-plugins list and hot-reload markers are tracked so the demo opens
  correctly. Don't commit the incidental churn from opening the vault.

## Backlog and parked ideas

Not scheduled — open ideas and known gaps, kept here so they aren't lost:

- **Component tests** for `Infobox.svelte` + `InfoboxRenderChild` — need vitest
  browser mode (or a DOM-capable obsidian mock). Currently covered only by the
  CDP pass above.
- **Full card hover in Bases** — native Bases cards expose no file link in their
  DOM, so the DOM-hook hover is table-first. A first-class `registerBasesView`
  custom "Infobox" view (typed API exists since Obsidian 1.10) is the clean path.
- **Block-option `EditorSuggest`** — autocomplete inside ` ```infobox ` fences.
  Deferred (the block language is tiny and documented).
- **Template inheritance** (`extends:`), **per-template CSS class**
  (`aib-template-<id>`), **per-key format hints** — parked; decide on real need.
- **Manual-only checks**: on-device mobile behavior, and a final human eyeball of
  a PDF export (can't drive File → Export over CDP).

## Key references

- [Research notes](docs/research-notes.md) — design, prior-art comparison, the data-model rationale.
- [docs/](docs/README.md) — user documentation (getting started, templates,
  block options, settings, theming, Bases, a TTRPG worked example).
- `.oxlintrc.json` — the lint conventions, with reasons.
