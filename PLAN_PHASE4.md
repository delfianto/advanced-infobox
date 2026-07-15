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

## 2. Block-option editor suggestion — *low priority (deferred 2026-07-15)*

**Deferred, not scheduled.** Pure typing convenience, not correctness. The
block language is tiny (7 keys, a few enum values, all documented in the
README), and auto-embed (§1) removes the need to write a block at all for
qualifying notes — shrinking the surface this would help. Build only if
hand-writing blocks with options becomes frequent enough that mistyping is a
real annoyance. Spec kept below for cold resume.

`EditorSuggest` scoped to inside ` ```infobox ` fences: complete option keys
(`placement`, `exclude`, `sections`, `unlisted`, `image`, `caption`,
`template`), enum values (right/left/full, show/hide), template ids from the
registry (`templates.ids()`), and frontmatter keys of the current note for
`exclude`/`sections` lists. Trigger detection: `editor.getLine` scan upward
for the opening fence. Moderate effort, big ergonomics win.

## 3. Property write-back (inline editing in the box) — *shipped 2026-07-15, verified in Obsidian 1.12.7 (boolean, number, string, date, list)*

Clicking a value in the infobox edits it; commit via
`fileManager.processFrontMatter` (never touches the body). Behind the global
**Edit properties in infobox** toggle (default off). Verified end to end by
driving real Obsidian (CDP) in both Reading view and Live Preview: every editor
writes frontmatter and the box updates in place; strings and dates round-trip,
Escape reverts, and the box floats/renders exactly as read-only.

Shipped — every scalar, date-only values, and lists of scalars:
- **boolean** → a clickable button reusing the ✓/✗ display (commits on click).
- **number** → `<input type=number>`; commits on blur/Enter, reverts on Escape
  or invalid input (`parseNumberInput` rejects empty/NaN/Infinity).
- **string** (`markdown` kind) → `<input type=text>`, commits the raw value.
- **date-only** (`YYYY-MM-DD`) → `<input type=date>`. Shows the OS date-picker
  format while editing is on, not `settings.dateFormat`. Datetime values (a time
  component) stay read-only.
- **list of scalars** → one text input per item with a remove (×) button and an
  add control. Any change rewrites the whole array in display order (order is
  preserved), re-typing each item like a bare YAML scalar (`coerceScalar`), so a
  numeric list stays numeric. Lists holding nested arrays/objects stay read-only.

Architecture:
- `src/model/edit.ts` — pure gates `isEditableValue` (boolean | number |
  markdown | date-only | list-of-scalars), `isDateOnly`, `parseNumberInput`,
  `listItemText`, and `coerceScalar` (all unit-tested).
- Editors live at the field-row level in `Infobox.svelte`, never inside the
  recursive `fieldValue` snippet. Gated on `model.editEnabled` +
  `isEditableValue`. Text and date share one `commitString` (empty reverts
  rather than clearing) and one `onEditKeydown` (Enter commits, Escape reverts,
  `stopPropagation` keeps CM6 out).
- Lists get their own `src/view/ListEditor.svelte` child: a local `$state` draft
  seeded from the saved items, with the parent wrapping it in a `{#key}` on the
  list's content so an external change remounts it with fresh values (the latch
  keeps that from landing mid-edit).
- Commit: `InfoboxRenderChild.commitField` → `processFrontMatter`.
- **Echo-loop latch** (the crux): the child's own `metadataCache."changed"`
  listener re-enters `refresh()`, which reassigns `model.vm` and would tear down
  a live `<input>` mid-edit. `beginEdit`/`endEdit` (an `editDepth` counter)
  defer refresh while a field editor is focused, reconciling once it settles.
  Verified: an external write during a focused edit leaves the input in place,
  focused, value intact, then both writes reconcile.
- Live Preview focus: inputs receive focus and keystrokes inside the CM6
  code-block widget; no `contenteditable` needed.

Deliberately out of scope (not editable):
- Header fields sourced via block-option overrides (`image`/`caption`) and the
  merged `tags` — they don't map 1:1 to a single `frontmatter[key]`.
- Datetime values (time component) and lists holding nested arrays/objects.
- Nested-object scalars (rendered as inline code) are technically text-editable
  but lossy — a known edge, discouraged anyway.
- Clearing a field to empty reverts rather than deleting the property (and
  emptying every list item writes `[]`); remove the property from the Properties
  panel instead.

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
- **Mobile verification** *(audited + hardened 2026-07-15; on-device check still
  pending)*: static audit done. Added a `@media (max-width: 500px)` float
  backstop (full-width box on phones even if the ResizeObserver never fires) and
  `@media (pointer: coarse)` roomier tap targets for the inline-edit controls
  (bool toggle, list ×/＋Add, inputs); `ResizeObserver` was already guarded, and
  number/date fields use native mobile pickers. Can't drive mobile Obsidian over
  CDP, so real on-device verification (touch, WebView quirks) is still manual.
- **PDF export spot-check** *(on-screen verified 2026-07-15; artifact check
  manual)*: confirmed the reading-view float renders correctly (box floats right,
  prose wraps to its left) and the float CSS is not `@media`-gated, so it applies
  in Obsidian's PDF export (which renders the reading-view DOM). Couldn't produce
  a real exported PDF automatically — `Page.printToPDF` is blocked on the Electron
  remote-debug socket — so eyeballing the paginated PDF once via File → Export to
  PDF remains a manual step.

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
