# Phase 4 backlog — pending & deliberately-not-done

Status as of 2026-07-15: Phases 0–3 shipped (see PLAN.md). The plugin is
feature-complete for personal use: flat-frontmatter infoboxes, per-note block
options, wiki sections, markdown template notes (incl. D&D/Cyberpunk/WoD
starters), Style Settings manifest, strict lint/type gates, 78 unit tests.

**Decision: no community plugin submission.** Distribution is private — the
existing tag-triggered release workflow (`.github/workflows/release.yml`)
produces GitHub releases that BRAT can install (`obsidian42-brat` → "Add a
beta plugin" → this repo). That covers the user's own devices.

The items below are what Phase 4 would have been, detailed enough to resume
cold in a future session.

---

## 1. Auto-embed mode (infobox without an anchor block)

Render the infobox automatically at the top of qualifying notes, no
` ```infobox ` block needed. Behind a global toggle (default off), because the
anchor block already works reliably in both modes.

- **Reading view**: `registerMarkdownPostProcessor` — detect the first
  rendered section of a note (ctx.frontmatter available), prepend a container,
  mount the same `InfoboxRenderChild`. Guard against double-render when the
  note *also* has an anchor block (skip auto if a processor already ran for
  this sourcePath — track per-path in the plugin).
- **Live Preview**: CM6 `ViewPlugin` adding a block widget decoration below
  the frontmatter/properties widget. This is the fiddly half: decoration must
  survive re-layout, coordinate with `fold-properties-by-default` (installed
  in the user's vault) and banners-reloaded, and never steal cursor focus.
- **Qualifying notes**: setting for "auto-embed when note has `infobox`
  property" (safest trigger) vs "any note with frontmatter" (noisy) vs
  folder allowlist.
- **Risk**: this is exactly the leaf-injection territory Omni got wrong;
  keep it strictly opt-in and lean on the existing render child.

## 2. Block-option editor suggestion

`EditorSuggest` scoped to inside ` ```infobox ` fences: complete option keys
(`placement`, `exclude`, `sections`, `unlisted`, `image`, `caption`,
`template`), enum values (right/left/full, show/hide), template ids from the
registry (`templates.ids()`), and frontmatter keys of the current note for
`exclude`/`sections` lists. Trigger detection: `editor.getLine` scan upward
for the opening fence. Moderate effort, big ergonomics win.

## 3. Property write-back (inline editing in the box)

Clicking a value in the infobox edits it; commit via
`fileManager.processFrontMatter` (never touches the body). Svelte makes the
edit-state easy; the hard parts:

- Type-aware editors (text, number stepper, checkbox toggle, date picker,
  list add/remove) — reuse `FieldValue.kind`.
- Echo loop: our own write fires `metadataCache.changed` → refresh → remount
  of the editor mid-typing. Needs an "editing" latch that defers refresh.
- Live Preview focus: the widget must not fight CM6 for the cursor
  (contenteditable inside a widget is fine; keyboard events need
  stopPropagation).
- Scope v1 to booleans + numbers (safe, high value for TTRPG stat bumps),
  strings later, lists last.

## 4. Docs (README is still the 3-line stub)

- README: what/why (the PLAN.md §1 research summary condenses well),
  install-via-BRAT instructions, quick start (frontmatter + empty block),
  block options table, template authoring guide (frontmatter labels, body
  sections, `- key: Label`, reserved `unlisted`), settings tour, theming
  (`--aib-*` variables + Style Settings), Live Preview vs Reading behavior
  (from PLAN.md §3.5), known wrinkles (quoted `"[[wikilinks]]"` in
  properties; `types.json` cosmetic mismatch in template notes).
- Screenshots: DUMMY.md in Reading (float) + Live Preview (collapsed card),
  Wikipedia preset, Style Settings panel. Store under `docs/`.

## 5. Smaller pending items

- **Collapse persistence option**: LP collapse state is session-only by
  design; optional "remember across restarts" toggle would persist the map
  in `data.json` (trim on vault close; cap size).
- **Chevron/collapse vars in @settings**: `--aib-chevron` styling isn't
  exposed; audit newer CSS additions against the Style Settings manifest.
- **Template folder rename**: currently degrades gracefully; could follow
  renames automatically via `vault.on("rename")` when oldPath === setting.
- **Per-key format hints** (open question from PLAN.md §6): date patterns or
  units per key. A `key: "Label | date:YYYY"` mini-syntax reintroduces DSL
  brittleness — if ever done, prefer a reserved template-frontmatter block
  key like `formats` parsed as flat `key: token` pairs. Decide only after
  real-world need.
- **Insert command variants**: "Insert infobox with sections skeleton"
  generated from the current note's frontmatter keys.
- **`refreshAll` debounce**: template edits refresh every open infobox per
  keystroke of the template note; a ~150ms debounce would cut churn.
- **Mobile verification**: `isDesktopOnly: false` but untested on mobile
  WebView (ResizeObserver, floats, collapse tap targets).
- **PDF export spot-check**: Reading-view float is believed to print
  correctly; verify once.

## 6. Testing gaps

- No component tests: `Infobox.svelte` and `InfoboxRenderChild` are untested
  (would need vitest browser mode or a fuller obsidian mock with DOM
  helpers — `createEl`, `addClasses`, `MarkdownRenderChild` lifecycle).
- No integration test for the registry (vault mock with template files).
- Visual regression is manual (test-vault notes serve as fixtures).

## 7. Toolchain watch-list (vite-plus alpha)

- `define` replacement was dropped on an incremental rebuild once
  (nondeterministic; caused the `__DEV_BUILD__` crash). Mitigated with
  `typeof` guards; consider reporting upstream with the repro attempt notes
  from the session log.
- The watch process's file watcher went stale after ~7h once (deploys
  silently stopped). Mitigation: dev builds toast their `__BUILD_TIME__` on
  every load — if the toast timestamp is old, restart `bun run dev`.
- `vp lint`/`vp fmt` do **not** auto-discover `.oxlintrc.json`/`.oxfmtrc.json`
  — the `-c` flags in package.json scripts are load-bearing; keep them when
  touching scripts.
- Revisit pinned versions when Vite+ leaves alpha (`vite-plus`,
  `@voidzero-dev/vite-plus-core` at ^0.2.4; overrides map `vite` to the core
  package).

## 8. Ideas parked (no commitment)

- Bases integration: render an infobox from a Bases entry, or a "row →
  infobox" hover card.
- Template inheritance (`extends: person` in template frontmatter).
- Per-template CSS class (`aib-template-<id>` on the container) for
  type-specific theming — trivial to add when someone wants
  character-sheets styled differently from places.
- ITS-style pipe modifiers on the block language (` ```infobox|left `) —
  redundant with block options; only if muscle memory demands it.
