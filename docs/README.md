# Advanced Infobox — Documentation

Wiki-style infoboxes for [Obsidian](https://obsidian.md), rendered from your plain, flat
frontmatter. Your properties stay the single source of truth; the infobox is just a view.

This is the reference documentation. For the project pitch, the prior-art comparison, and
BRAT install instructions, see the [main README](../README.md).

## Start here

- **[Getting started](getting-started.md)** — install, your first infobox, and a quick tour of the two views.
- **[Data model](data-model.md)** — the flat-frontmatter rule, and how each value type (links, lists, numbers, dates, checkboxes) renders.

## Reference

- **[Templates](templates.md)** — define a layout once (labels, sections, hidden fields) and reuse it across every note that opts in.
- **[Block options](block-options.md)** — the `` ```infobox `` block's per-note, presentation-only options.
- **[Settings](settings.md)** — every control in the plugin's settings tab, with defaults.
- **[Theming](theming.md)** — the `--aib-*` CSS-variable API, the Style Settings integration, and the visual presets.
- **[Bases](bases.md)** — generate an Obsidian Base from a folder of notes, and preview a note's infobox on hover inside a Base.

## Worked example

- **[TTRPG character sheets](ttrpg-example.md)** — a full 12-class D&D 5e roster built on a single template, showing the caster-vs-martial trick that makes whole sections appear and vanish on their own.

---

> Every example in these docs comes from the in-repo [`test-vault/`](../test-vault) — open
> it in Obsidian (with the hot-reload plugin) to poke at the notes live.
