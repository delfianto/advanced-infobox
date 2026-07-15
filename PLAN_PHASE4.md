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

## 1. Auto-embed mode (infobox without an anchor block) — *shipped 2026-07-15, verified in Obsidian 1.12.7*

Renders the infobox at the top of qualifying notes, no ` ```infobox ` block
needed. Behind the global **Auto-embed** toggle (default off). Verified end to
end by driving a real Obsidian over its remote-debugging port (CDP): reading
float + wrap, LP card under Properties, template resolution, per-note opt-out,
and the double-render guard all confirmed with screenshots + DOM assertions.

Scope chosen this session:
- **Trigger** (single mode, not the three surveyed): the note carries the
  template property (`templateKey`, `infobox` by default) set truthy —
  `infobox: person` (also selects that template) or `infobox: true`.
  `infobox: false`/`no`/`off`/empty is a per-note opt-out. Reuses the one
  property that already names a template, so there's a single knob.
- **Both view modes.** A note with an explicit anchor block is never
  double-rendered: both paths scan the source for an ` ```infobox ` fence and
  step aside.

Architecture (for cold resume):
- `src/model/auto-embed.ts` — pure gates `isAutoEmbedTrigger`,
  `qualifiesForAutoEmbed`, `hasInfoboxAnchor` + the shared `AUTO_EMBED_CLASS`
  (unit-tested).
- **Reading view** `src/view/auto-embed-reading.ts`: a
  `registerMarkdownPostProcessor` injecting one `.aib-auto-embed` container
  into `.markdown-preview-sizer` (after the inline title), once per render
  (self-healing marker element, no docId tracking). Skips embeds/popovers and
  Live Preview (no sizer). Mounts the ordinary `InfoboxRenderChild`, empty source.
- **Live Preview** `src/view/auto-embed-live.ts` (a **`StateField<DecorationSet>`**)
  + `src/view/InfoboxWidget.ts` (block widget) + `src/view/frontmatter-boundary.ts`
  (`bodyStart`, unit-tested). Widget sits below the Properties widget, is `eq`
  by note path (no per-keystroke remount), `ignoreEvent`s to keep the caret out,
  keys its child by DOM element (WeakMap) so CM's instance-swap on an `eq` match
  can't leak the child, and gates on `editorLivePreviewField` (no widget in raw
  Source mode). File comes from `editorInfoField` (no view/leaf lookup).
- Toggling reflects immediately via `plugin.reloadAutoEmbed()`; frontmatter
  edits reach the LP widget via `refreshAutoEmbedFor` on `metadataCache`
  "changed" (both dispatch an `autoEmbedRefresh` StateEffect).
- `@codemirror/state` / `@codemirror/view` added as devDeps (typings only;
  already in the build's `external` list).

Two non-obvious runtime bugs caught only by driving real Obsidian (both fixed):
1. **Block decorations may not come from a `ViewPlugin`** ("Block decorations
   may not be specified via plugins"). Because a MarkdownView always builds its
   editor sub-view, the throw during `setViewData` broke the *entire* note load
   for any qualifying note. Fix: deliver via a `StateField` (which is allowed).
2. **Reading-view post-processor runs on detached section elements** (and
   throwaway copies), so `el.closest(sizer)` is null at call time and injection
   silently never fires. Fix: poll briefly (up to ~1s) and inject the moment the
   element attaches; give up on copies that never do.

Remaining / known limitations:
- In reading mode the (hidden) editor sub-view also mounts its LP widget — one
  extra off-screen render per qualifying note. Harmless and mirrors how the
  anchor block renders in both sub-views; not worth special-casing.
- LP anchor scan is `doc.toString()` per doc-change — fine for normal notes,
  revisit only if huge-note typing lags.
- Coexistence with `fold-properties-by-default` / `banners-reloaded` around the
  frontmatter is untested (the user's real vault has these; the isolated test
  vault does not).

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

- ~~Collapse persistence option~~ *(shipped 2026-07-15)*: "Remember collapse
  state" toggle persists the per-note map in `data.json` (300-entry cap,
  oldest evicted, disk writes debounced 1s).
- ~~Manifest audit~~ *(shipped 2026-07-15)*: `--aib-border-width`,
  `--aib-image-radius`, `--aib-section-weight` added to the Style Settings
  manifest. Chevron color intentionally rides `--aib-muted-color`.
- ~~Template folder rename~~ *(shipped 2026-07-15)*: renaming the template
  folder now re-points the setting automatically.
- ~~Insert command variants~~ *(shipped 2026-07-15)*: "Insert infobox with
  sections skeleton" seeds a `sections:` scaffold from the active note's
  own properties.
- ~~`refreshAll` debounce~~ *(shipped 2026-07-15)*: template-driven
  refreshes are debounced 150ms; settings changes stay immediate.
- **Per-key format hints** (open question from PLAN.md §6): date patterns or
  units per key. A `key: "Label | date:YYYY"` mini-syntax reintroduces DSL
  brittleness — if ever done, prefer a reserved template-frontmatter block
  key like `formats` parsed as flat `key: token` pairs. Decide only after
  real-world need.
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
