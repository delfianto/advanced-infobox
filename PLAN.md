# Advanced Infobox — Plan

A wiki-style infobox plugin for Obsidian that treats **plain, flat frontmatter as the single
source of truth**. Presentation (placement, styling, fonts, field layout) is configured in plugin
settings and CSS variables — never by duplicating or nesting data.

---

## 1. Research: existing implementations and why they fall short

### 1.1 [mpospirit/obsidian-infobox](https://github.com/mpospirit/obsidian-infobox)

**How it works:** registers a `registerMarkdownCodeBlockProcessor("infobox", …)`. The entire
infobox content (title, image, caption, `rows:` with label/value/mvalue) lives inside the code
block. Rendered as a float-right table.

**Problems found in source (`src/main.ts`):**

- **Hand-rolled line-by-line "YAML" parser** (~90 lines): splits on the first `:`, strips quotes
  with a regex, tracks indentation manually. No escaping, no multiline values, no lists inside
  values. One stray colon or indent change silently drops a field — this is the brittleness
  problem in its purest form.
- **Full data duplication**: everything in the code block re-states what belongs in frontmatter.
  Frontmatter, Dataview, Bases, and the infobox can silently disagree.
- **Zero settings**: no settings tab at all. Width (`22em`), font size (`0.88em`), and float
  direction are hard-coded in `styles.css`. The only hook is a `type:` field that adds a
  `infobox--<type>` CSS class you must style yourself.
- Two value fields (`value` vs `mvalue`) leak an implementation detail (plain text vs
  `MarkdownRenderer`) into the user-facing schema.

**What it gets right:** code-block anchoring works in both Reading view and Live Preview; uses
`MarkdownRenderer.render` and `getFirstLinkpathDest`/`getResourcePath` correctly; partial use of
Obsidian CSS variables (`--table-border-color`, `--background-secondary`).

### 1.2 [omni-gh549/obsidian-infobox](https://github.com/omni-gh549/obsidian-infobox) (Omni Infobox)

**How it works:** reads a **nested `infobox:` object from frontmatter** and injects an absolutely
positioned panel into every markdown leaf by iterating all leaves on `layout-change` /
`active-leaf-change` / `metadataCache.changed` (rAF-debounced), then `appendChild`-ing into the
view container.

**Problems found in source (`main.js`):**

- **Nested, nonstandard frontmatter is the data model.** `infobox.fields` is a YAML *array of
  single-key maps* (`- Born: March 14, 1879`). Obsidian's Properties UI cannot edit nested
  objects — it renders them as an opaque blob, and editing adjacent properties through the UI can
  reserialize and corrupt the structure. This is exactly the "brittle nested YAML" failure mode.
- **Data duplication again**: `title`, `tags`, etc. inside `infobox:` shadow the real frontmatter
  keys; there is fallback logic for tags only.
- **DOM injection hack**: `position: absolute` panel pinned top-right over `.view-content`, with
  a hard-coded `padding-right: 300px` pushed onto `.markdown-preview-sizer` / `.cm-sizer`. It
  fights the layout instead of participating in it, cleans up with global
  `document.querySelectorAll('.infobox-panel')` sweeps, and re-renders every leaf on every layout
  event.
- **Theming by duplication**: plain JS (no TypeScript, no build), hard-coded hex colors with a
  parallel `.infobox-theme-dark` copy of nearly every rule, manual `theme-dark` body-class
  sniffing. Ignores Obsidian's CSS variables almost entirely, so it clashes with any theme.
- **Reimplements markdown**: custom regex wikilink parser + manual click handlers instead of
  `MarkdownRenderer`. No bold/italic/embeds; edge cases (aliases with `]]` etc.) break.
- **Configuration**: effectively none — a `showTags` boolean *inside the frontmatter itself*.

### 1.3 Closest prior art: [WikiKit](https://github.com/Scriptception/WikiKit)

Validates the core concept of this project: **data from flat frontmatter, code block only as a
presentation anchor** (`exclude`, `caption`, `image`, width overrides). But it is plain
JavaScript, has only three settings (width, strip-title, default excludes), styling means
hand-editing `styles.css`, there is no field ordering/labels/sections/templates, no left/right
placement, and no Style Settings integration. Known breakage on malformed tags.

### 1.4 CSS-only approaches: [ITS Theme](https://publish.obsidian.md/slrvb-docs/ITS+Theme/Callouts/Callout+-+Infoboxes) and [Avyrra/Obsidian-Infoboxes](https://github.com/Avyrra/Obsidian-Infoboxes)

- ITS styles a `> [!infobox|right wikipedia]` callout via the `data-callout-metadata` attribute.
  Elegant, zero-plugin — but data is a hand-written markdown table (total duplication), and the
  author explicitly documents that **positioning does not work in Live Preview**.
- Avyrra's plugin adds a custom DSL inside callouts (`Label -> value`, `// Section`, `~yaml` to
  pull selected frontmatter keys) plus Style Settings integration and `[!infobox]` /
  `[!infoboxleft]` variants. The `~yaml` directive shows demand for frontmatter-driven boxes, but
  the DSL is yet another nonstandard syntax living in the note body.

**Takeaways worth stealing:** pipe-modifier ergonomics (`|left`), Style Settings as the
community-standard theming surface, Wikipedia table aesthetics.

### 1.5 Summary of limitations to solve

| Limitation | mpospirit | Omni | WikiKit | ITS/Avyrra |
| --- | --- | --- | --- | --- |
| Data duplicated outside frontmatter | ✗ (code block) | ✗ (nested copy) | ✓ solved | ✗ (tables/DSL) |
| Properties-UI-safe (flat YAML only) | n/a | ✗ | ✓ | ✓ |
| Robust parsing (real YAML lib) | ✗ | ✓ (cache) | ? | n/a |
| Live Preview support | ✓ | ✗ | ✓ | ✗ (position) |
| Placement setting (left/right/…) | ✗ | ✗ | ✗ | ✓ |
| Font size / theming settings | ✗ | ✗ | width only | via Style Settings |
| Uses theme CSS variables | partial | ✗ | ? | ✓ |
| TypeScript + tests | TS, no tests | ✗ | ✗ | TS, no tests |

---

## 2. Goals

1. **Frontmatter-native**: the infobox renders *your existing flat frontmatter*. No nested
   objects, no duplicated fields, no custom DSL. Everything stays editable in Obsidian's
   Properties UI and legible to Dataview/Bases/templates.
2. **Robust**: no hand-rolled parsers. Data comes from `metadataCache` (Obsidian's own parse);
   the optional per-note config block is parsed with Obsidian's exported `parseYaml`, is
   *presentation-only* (breaking it can never lose data), and fails with a friendly inline error.
3. **Customizable**: first-class settings for placement (float right / float left / full-width /
   top), width, font size, density, and colors — implemented as CSS custom properties so themes,
   snippets, and the Style Settings plugin can all override them (the ITS approach, done
   natively).
4. **Modern stack**: Bun + Vite + TypeScript + Svelte 5 (runes), mirroring
   [delfianto/inkwell](https://github.com/delfianto/inkwell). Svelte only where it earns its
   keep; native Obsidian `Setting` components elsewhere.

Non-goals (for now): editing note *content* from the infobox, dataview-style queries across
notes, mobile-specific layouts beyond responsive full-width collapse.

---

## 3. Design

### 3.1 Data model — where information comes from

```yaml
---
# plain, flat, Properties-UI-editable frontmatter — the ONLY data source
title: Albert Einstein
subtitle: Theoretical physicist
image: "[[einstein-1921.jpg]]"
caption: Photograph from 1921
born: 1879-03-14
died: 1955-04-18
field: "[[Theoretical physics]]"
known_for:
  - "[[General relativity]]"
  - "[[Photoelectric effect]]"
infobox: person        # optional: selects a template note (see 3.2)
---
```

In the note body, a minimal anchor marks where the box renders:

````markdown
```infobox
```
````

The block body is **optional** and may contain presentation-only overrides (parsed with
`obsidian.parseYaml`, validated, never containing data):

````markdown
```infobox
placement: left        # override global placement for this note
exclude: [aliases, cssclasses]
sections:              # wiki-style header rows grouping the listed keys
  Identity: [race, class, level]
  Combat: [armor_class, hit_points]
unlisted: hide         # drop properties no section names (default: show)
template: person       # alternative to the `infobox` frontmatter key
```
````

Breaking this block degrades styling, never data — the failure mode is a rendered error hint,
and the frontmatter remains untouched and valid.

### 3.2 Field layout — how flat keys become a structured box

Resolution order for what to show:

1. **Template** (if the note's `infobox` property or block `template:` names one): templates
   are plain markdown notes living in a configurable vault folder (see below). They specify
   display labels, key order, and sections. Data notes stay flat; structure lives in the
   template, defined once per "type" (person, place, character, …).
2. **Zero-config fallback**: render all frontmatter keys in file order, minus a global exclude
   list (default: `tags, aliases, cssclasses, infobox`), with prettified labels
   (`known_for` → "Known For").

Special keys (each remappable in settings): `title` (falls back to filename), `subtitle`,
`image` (wikilink, vault path, or URL), `caption`, `tags`.

#### Templates are markdown notes, editable in Obsidian itself

A template is a regular note inside the **template folder** (a plugin setting with folder
autocomplete; default `templates/infobox`). The note's basename is the template id:
`infobox: person` resolves to `<template folder>/person.md`. Because templates are ordinary
notes, they are edited with the normal Obsidian UI (including the Properties panel), sync with
the vault, diff cleanly in git, and are shared by copying a file — no custom editor UI, no
plugin-private JSON.

The template's **frontmatter maps property keys to display labels**, and its key order is the
display order (the Properties UI supports drag-reordering, so arranging fields is
point-and-click):

```yaml
---
eye_color: Eye Color
hair_color: Hair Color
born: Born
died: Died
---
```

The template's **body optionally adds sections**: headings become section headers, and the list
items beneath them name the keys in that section (a `key: Label` item overrides the
frontmatter label in place):

```markdown
## Appearance
- eye_color
- hair_color

## Life
- born: Born
- died: Died
```

Rules and behavior:

- Empty body → frontmatter order, no sections. Data-note keys not named by the template fall
  back to zero-config rendering below the templated fields (or are hidden via a per-template
  `unlisted: hide` switch).
- **No hand-rolled parsing**: labels come from `metadataCache` frontmatter; body structure comes
  from the cache's `headings`/`listItems` position data applied over a `cachedRead` — the same
  parser Obsidian itself uses, consistent with the plugin's robustness principle.
- Templates are **watched** via `metadataCache.on("changed")`: editing a template live-updates
  every open infobox using it. A deleted or renamed template degrades to the zero-config render
  plus a gentle inline notice.
- **Known wrinkle**: Obsidian property *types* are global per key name (`types.json`). If data
  notes type `born` as Date, the template's `born: Born` (a text label) shows a cosmetic
  type-mismatch icon in the template note's Properties panel. Harmless, but for type-sensitive
  keys (date/number/checkbox/list) the body form (`- born: Born`) avoids it entirely — the docs
  will recommend body labels for those keys, frontmatter labels for plain-text keys.

### 3.3 Value rendering

- Resolve values from `metadataCache.getFileCache(file).frontmatter` — never re-parse the file.
- Strings run through `MarkdownRenderer.render` → wikilinks, formatting, and embeds just work;
  links participate in the graph (Obsidian already tracks quoted `"[[links]]"` in properties via
  `frontmatterLinks`).
- Type-aware formatting: arrays → comma list or chips (setting); booleans → ✓/✗; dates →
  configurable format; numbers → locale-aware.
- Image resolution exactly like the official pattern: strip `![[…]]`, then
  `getFirstLinkpathDest` + `vault.getResourcePath`, or pass through `http(s)` URLs.

### 3.4 Rendering architecture

- `registerMarkdownCodeBlockProcessor("infobox", …)` → mount a `MarkdownRenderChild` subclass.
  Code-block widgets render natively in **both Reading view and Live Preview** — this is why the
  anchor approach beats both Omni's leaf-injection and ITS's reading-only positioning.
- The render child subscribes to `metadataCache.on("changed")` for its file → editing a property
  in the Properties UI updates the infobox live. Cleanup via `onunload` (no global DOM sweeps).
- The box itself is a **Svelte 5 component** (`Infobox.svelte`, runes mode): view-model in, DOM
  out, reactive re-render on cache changes. Markdown-rendered values are injected via an
  attachment that calls `MarkdownRenderer.render` into the placeholder element.
- Float placement is pure CSS on the widget container (`float: right` etc. like mpospirit —
  content flows around it). Responsive collapse to full-width on narrow panes via CSS container
  queries on the markdown pane (modern Electron supports them; no window-level media query
  mismatch).

### 3.5 Live Preview vs Reading view behavior

The anchor block is invisible in both modes by construction — a registered code-block processor
**replaces** the fence with its output (this is exactly how the built-in Bases `base` blocks
work). The raw ` ```infobox ` text is only ever visible in Source mode, and in Live Preview
while the cursor/selection is inside the block (the standard CM6 edit affordance: the widget
expands to editable text, then collapses back on blur). No CSS hiding is involved, and Reading
view has no state where the fence text shows.

Where the two modes genuinely differ is **text wrapping around a floated box**:

- **Reading view** — the rendered root can `float: right/left` and body text wraps around it,
  the true Wikipedia look. This works because Obsidian's preview section wrappers don't
  establish a block formatting context that would contain the float (mpospirit relies on the
  same behavior today).
- **Live Preview** — the processor output renders as a CodeMirror **block widget**; editor lines
  are siblings that will not wrap around a floated widget. This is a CM6 structural limitation —
  the same reason ITS documents that its positioning "will not work in Live Preview" — not
  something a plugin can style its way out of.

Design decision: placement settings apply fully in Reading view; in Live Preview the infobox
renders as a clean non-wrapping card instead. A dedicated **Live Preview presentation** setting
controls that card's form: `full-width` (default) or `aligned` (kept at infobox width and pushed
to the configured side, with empty space beside it). Docs and the settings UI must state this
asymmetry explicitly so it reads as intended behavior rather than a bug.

### 3.6 Theming & customization (the ITS lesson, done natively)

All visual knobs are CSS custom properties, defaulting to Obsidian theme variables:

```css
.aib-infobox {
  --aib-width: 22em;
  --aib-font-size: 0.9em;
  --aib-bg: var(--background-secondary);
  --aib-border: var(--background-modifier-border);
  --aib-label-color: var(--text-muted);
  --aib-radius: var(--radius-m);
  /* … */
}
```

Three override layers, weakest to strongest:

1. **Theme / snippet CSS** — everything targetable by class, nothing uses `!important`.
2. **Style Settings plugin** — ship a `/* @settings */ ` manifest in `styles.css` so power users
   get sliders/pickers for every variable.
3. **Plugin settings tab** — placement, width, font size, density preset (compact/normal/
   comfortable), and visual preset (Obsidian-native / Wikipedia-classic). Settings are applied by
   writing the CSS variables onto a scoped style element, so they compose with 1 and 2.

Per-note: `placement` in the config block; template selection via the flat `infobox` property.

### 3.7 Settings UI

- Scalar settings (placement, width, font size, excludes, date format, template folder):
  **native Obsidian `Setting` API** — zero framework overhead, matches the app. The template
  folder picker reuses inkwell's `folder-suggest.ts` pattern.
- **No custom template editor**: templates are markdown notes (§3.2), so the vault *is* the
  editor. This shrinks the Svelte surface to the infobox component itself — exactly the
  "Svelte only when it earns its keep" rule.

---

## 4. Tech stack & project structure (per inkwell)

- **Runtime/PM**: Bun (`bun.lock`, `bunfig.toml`)
- **Build**: Vite via vite-plus (`vp build`, `vp lint`, `vp fmt`, `vp test`); CJS lib build →
  `main.js` + `styles.css` + copied `manifest.json`; `--watch` deploys into `$PLUGINS_DIR`
  (direnv `.envrc`) or the in-repo test vault, with `.hotreload` for the hot-reload plugin
- **UI**: Svelte 5 (runes) via `@sveltejs/vite-plugin-svelte`
- **Language**: TypeScript 6.x, `obsidian` typings ^1.13
- **Tests**: Vitest + `test/__mocks__/obsidian.ts`; CI via GitHub Actions (unit-tests + release
  workflows, as in inkwell)

```
advanced-infobox/
├── manifest.json / versions.json
├── package.json / bunfig.toml / tsconfig.json
├── vite.config.mts / svelte.config.js / vitest.config.ts
├── .envrc.example
├── PLAN.md
├── src/
│   ├── main.ts                  # plugin entry: processor + settings registration
│   ├── settings/
│   │   ├── settings.ts          # schema, defaults, migration
│   │   ├── SettingsTab.ts       # native Setting API
│   │   └── folder-suggest.ts    # template-folder autocomplete (inkwell pattern)
│   ├── model/
│   │   ├── schema.ts            # frontmatter → view-model normalization
│   │   ├── template.ts          # template note parsing (labels, sections)
│   │   ├── template-registry.ts # folder scan, id → note resolution, change watch
│   │   ├── block-config.ts      # parseYaml + validation of the anchor block
│   │   └── values.ts            # type-aware value formatting
│   ├── view/
│   │   ├── InfoboxRenderChild.ts # MarkdownRenderChild, cache subscription, Svelte mount
│   │   ├── Infobox.svelte
│   │   └── markdown.ts          # MarkdownRenderer attachment helper
│   └── styles.css               # CSS vars + @settings manifest for Style Settings
├── test/                        # vitest unit tests + obsidian mocks
└── test-vault/                  # dev vault with hot-reload + sample notes per template
```

---

## 5. Milestones

**Phase 0 — Scaffold**
Repo tooling (bun, vite-plus, svelte, tsconfig, vitest, prettier), manifest, test vault with
hot-reload, dev-deploy watch flow, CI workflows. Definition of done: empty plugin loads in the
test vault and hot-reloads.

**Phase 1 — MVP (frontmatter → box)**
Code block processor + `InfoboxRenderChild`; zero-config rendering of flat frontmatter (title/
image/caption/fields, global exclude list); markdown value rendering; live update on
`metadataCache.changed`; base stylesheet on theme variables; global placement setting
(right/left/full) + width; graceful error states (no frontmatter, missing image, bad block
config); wiki-style section header rows via per-note block config (`sections`, `unlisted`) —
the same grouping mechanism templates will drive vault-wide in Phase 3. Unit tests for
`schema.ts` and `block-config.ts`.

**Phase 2 — Customization depth**
Full settings tab (font size, density, visual preset, Live Preview presentation
(full-width/aligned), date/array/boolean formatting, key→label map, special-key remapping);
per-note block overrides (`placement`, `exclude`, `image`,
`caption`); Style Settings `@settings` manifest; container-query responsive collapse; command
"Insert infobox" + editor suggestion for the block.

**Phase 3 — Markdown templates**
Template registry (scan configured folder, resolve `infobox:` property → template note, watch
edits/renames/deletes); frontmatter label map + body section parsing (cache-based); template
folder setting with autocomplete; sample templates shipped as markdown notes (person, place,
organization, character) created on demand by a command; "Insert infobox with template" and
"Add missing template properties to note" commands (the latter scaffolds keys via
`fileManager.processFrontMatter`).

**Phase 4 — Polish & release**
Optional auto-embed mode (render at top of note without an anchor — CM6 widget below
frontmatter in LP, post-processor prepend in Reading; ship behind a toggle since Phase 1 anchor
already covers both modes reliably); property write-back exploration (`fileManager.
processFrontMatter`) for inline editing; docs with screenshots; community plugin submission.

---

## 6. Risks & open questions

- **Live Preview quirks**: code-block widgets re-mount on scroll/edit churn in CM6; the render
  child must be cheap to construct (memoize view-model, avoid layout thrash).
- **Frontmatter wikilinks** must be quoted (`"[[x]]"`) to be valid YAML — Obsidian handles this,
  but docs should call it out since unquoted links are a common user error.
- **Container query support** assumed from Obsidian's Electron/Chromium; verify on the oldest
  supported installer version and on mobile WebView; fall back to a ResizeObserver class toggle
  if needed.
- **Template notes**: moving/renaming the template folder must re-point the setting or degrade
  gracefully; a deleted referenced template falls back to zero-config + notice; the global
  property-type registry (`types.json`) can flag template label values as type mismatches on
  date/number/list keys — cosmetic, avoided by body-form labels (§3.2). Open question: per-key
  format hints (date patterns, units). Start with global type-based formatting only; a
  `key: "Label | date:YYYY"` mini-syntax is tempting but reintroduces exactly the DSL
  brittleness this plugin exists to avoid, so decide after real-world usage.
- **Naming**: repo/plugin id `advanced-infobox`; CSS prefix `aib-`. Confirm display name before
  community submission.
