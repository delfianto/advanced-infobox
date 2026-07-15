# Advanced Infobox

Wiki-style infoboxes for [Obsidian](https://obsidian.md), rendered from your plain, flat
frontmatter. Your properties stay the single source of truth; the infobox is just a view.

> **📖 [Full documentation →](docs/README.md)** — getting started, the data model, templates,
> block options, settings, theming, and a complete D&D 5e worked example, all with screenshots.

## Obligatory disclosure, and a word to the detractors

Yes, this plugin was written by an AI, directed by a human with strong opinions and a
character sheet to render. I can already hear the keyboard warming up: *"ugh, another
AI-authored plugin."*

Here is what this AI-authored plugin has: a researched design document comparing every
prior infobox implementation and their failure modes, 78 unit tests, a strict lint gate
with import ordering, full-strict TypeScript, a documented CSS variable API, and release
automation. Here is what your hand-artisanal, free-range, conceptually-pure plugin has:
a half-finished `main.ts` and a dream — because the person loudest about how software
*should* be built is reliably the one who ships nothing. If provenance offends you more
than quality convinces you, wonderful news: this isn't in the community store, nobody is
making you install it, and the door is right there. Sod off at your leisure.

For everyone else: **this is a personal-use plugin.** I built it for my vault. If it's
useful to you too, install it with BRAT (below) and enjoy. Issues and ideas are welcome;
entitlement is not.

## Why another infobox plugin

Every existing option gets the data model wrong (full write-up in [PLAN.md](PLAN.md)):

- Code-block infoboxes ([mpospirit](https://github.com/mpospirit/obsidian-infobox)) make
  you **duplicate your frontmatter** into a hand-parsed pseudo-YAML block. One stray colon
  silently eats a field.
- Nested-frontmatter infoboxes ([Omni](https://github.com/omni-gh549/obsidian-infobox))
  store data in an `infobox:` object that **Obsidian's Properties UI can't edit** and can
  corrupt.
- CSS-callout infoboxes (ITS theme et al.) are hand-written tables — total duplication,
  and positioning breaks in Live Preview.

This plugin's rule: **data lives in flat frontmatter, editable in the Properties panel,
visible to Dataview/Bases. Presentation lives elsewhere** — settings, CSS variables, and
template notes. Breaking any presentation config can never lose data.

## Install (BRAT)

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) from the community store.
2. Command palette → **BRAT: Add a beta plugin for testing** → `delfianto/advanced-infobox`.
3. Enable **Advanced Infobox** in Settings → Community plugins.

Releases are produced by tagging this repo (`main.js` + `manifest.json` + `styles.css`).

## Quick start

Give a note some ordinary properties, then drop an anchor block anywhere in the body:

````markdown
---
title: Brynna Emberforge
subtitle: Mountain Dwarf Paladin
image: "[[brynna.png]]"
race: "[[Mountain Dwarf]]"
class: "[[Paladin]]"
level: 10
inspiration: true
weapons:
  - Warhammer +1
  - Handaxe
---

```infobox
```
````

That's it. Reading view gets a floating wiki-style box the text wraps around; Live Preview
gets a clean card. Keys are auto-prettified (`armor_class` → "Armor Class"), wikilinks are
clickable, numbers/dates/checkboxes/lists render type-aware, and editing a property in the
Properties panel updates the box live.

## Block options (presentation only, never data)

````markdown
```infobox
placement: left          # right | left | full (this note only)
exclude: [draft, status] # hide these properties here
image: cover.png         # override the image property
caption: A caption       # override the caption property
sections:                # wiki-style header rows
  Identity: [race, class, level]
  Combat: [armor_class, hit_points]
unlisted: hide           # drop properties no section names (default: show)
template: character      # use a template note (see below)
```
````

Malformed options render a friendly inline warning; your frontmatter is never touched.

## Templates (define a layout once, reuse everywhere)

A template is an **ordinary markdown note** in your template folder (default
`Templates/Infobox`, configurable). The note's name is its id; a note opts in with a flat
property: `infobox: character`.

- Template **frontmatter** maps keys to labels; its key order is the display order:
  `armor_class: AC`
- Template **body** adds sections: headings become header rows, list items name the keys
  (`- born: Born` overrides a label in place). Prose is ignored — templates can document
  themselves.
- `unlisted: hide` in template frontmatter drops properties the template doesn't name.
- Editing a template live-updates every open infobox using it.

Built-in starters via the **"Create sample infobox templates"** command: `person`, `place`,
`organization`, `character`, plus ready-to-use TTRPG sheets — `dnd` (D&D 5e), `cyberpunk`
(Cyberpunk RED), `wod` (World of Darkness).

## Commands

- **Insert infobox** — plain anchor block
- **Insert infobox with template** — fuzzy-pick a template
- **Insert infobox with sections skeleton** — scaffold sections from the note's own keys
- **Create sample infobox templates** — write the starters (only missing ones)
- **Add missing template properties to note** — scaffold the template's keys into
  frontmatter via Obsidian's own API

## Settings

Placement (float right/left/full-width), Live Preview presentation and collapse
(off / start expanded / start collapsed, optionally remembered across restarts), width,
font size, density, visual preset (Obsidian-native or Wikipedia-classic with dark-mode
variant), excluded keys, custom labels, label alignment, list/checkbox/date formatting,
special-key remapping (title/subtitle/image/caption/template), template folder.

## Theming

Every visual knob is a `--aib-*` CSS variable defaulting to your theme's variables. Three
override layers, weakest to strongest: theme/snippet CSS → the
[Style Settings](https://obsidian.md/plugins?id=obsidian-style-settings) plugin (~28
controls under Layout / Typography / Colors / Lists) → the plugin settings tab, which only
writes values you've changed. Alignment declarations carry a documented `!important` to
survive theme table styling (looking at you, AnuPpuccin) — but they read the variables, so
every override path still works.

## Live Preview vs Reading view (honest limitations)

Reading view renders a true float: body text wraps around the box, Wikipedia-style. Live
Preview is a CodeMirror editor — editor lines cannot wrap around a block widget (that's why
ITS positioning "doesn't work in Live Preview"), so LP renders a non-wrapping card
(full-width or side-aligned, your choice) with optional collapse. This is an architectural
property of every editor of this kind, not a missing feature.

## Gotchas

- Wikilinks in properties must be quoted to be valid YAML: `image: "[[cover.png]]"`.
- Obsidian's property *types* are global per key name: a template's `born: Born` label may
  show a cosmetic type-mismatch icon if your notes type `born` as Date. Use the body form
  (`- born: Born`) for type-sensitive keys.
- Vault paths are case-sensitive on Linux; keep template folder casing consistent.

## Development

```bash
bun install
bun run dev    # watch build into $PLUGINS_DIR (see .envrc.example) or test-vault/
bun run check  # format + strict lint    bun run test / type-check / build
```

The in-repo `test-vault/` has demo notes for every feature; pair with the hot-reload
plugin for instant reloads. Dev builds toast their build timestamp on load so a stale
deploy can never gaslight you (ask me how I know).

## Credits

Project structure mirrors [inkwell](https://github.com/delfianto/inkwell) (Bun + Vite+ +
Svelte 5 + strict TS). Design informed by the prior art it replaces — see
[PLAN.md](PLAN.md) for the full research. MIT licensed.
