# Theming

The infobox is designed to look like it belongs in your vault. Every visual knob is a
`--aib-*` CSS custom property that **defaults to one of your theme's variables**, so out of
the box the card follows your active theme — the screenshots in these docs are the
`native` preset on the default light theme, untouched.

## Three override layers

Anything you want to change can be set at one of three layers, weakest to strongest:

1. **Theme / snippet CSS** — redefine any `--aib-*` variable in a CSS snippet or theme.
2. **[Style Settings](https://obsidian.md/plugins?id=obsidian-style-settings)** — if you
   have that plugin, Advanced Infobox exposes ~28 controls under **Layout**, **Typography**,
   **Colors**, and **Lists** (width, radius, padding scale, every color, label/value/section
   alignment, and more) with live sliders and color pickers.
3. **The plugin settings tab** — the everyday controls ([settings](settings.md)). It only
   writes variables for values you actually change, so it never fights your theme for
   anything you left alone.

Because all three write the same variables, they compose: set a base look in a snippet, then
nudge it per-need in settings.

## Visual presets

The **Visual preset** setting picks the card's overall skin:

- **Obsidian native** — follows your theme's surfaces, borders, and text colors. The card
  looks native to whatever theme you run (this is what the docs screenshots use).
- **Wikipedia classic** — the familiar light-gray infobox card with subtly rounded corners,
  including a dark-mode variant so it stays readable in dark themes.

## Layout knobs

The common adjustments live in [settings](settings.md#layout): **placement** (float right /
left / full width), **width** and **font size** (sliders that show the applied value),
and **density** (Compact / Normal / Comfortable — a padding scale). Alignment of the label,
value, and section-header columns is available in settings and, more fully, via Style
Settings.

> Alignment declarations carry a documented `!important` so they survive aggressive theme
> table styling (looking at you, AnuPpuccin). They still read from the `--aib-*` variables,
> so every override path above continues to work.

Images (single or the [multi-image carousel](data-model.md#images-and-the-carousel)) are
capped at `--aib-image-max-height` (default `20em`) so a tall or oversized image never
balloons the card. Adjust it under Style Settings → Image max height, or in a snippet.

## Live Preview vs Reading view

A theming reminder that's really an architecture note: Reading view floats the box and wraps
text around it; Live Preview renders a non-wrapping card because a CodeMirror editor cannot
wrap lines around a block widget. Both honor the same variables and presets — see
[Getting started](getting-started.md#the-two-views) for the visual comparison.

## See also

- [Settings](settings.md) — the controls that write these variables.
- [Data model](data-model.md) — list and checkbox *formatting* (as opposed to color/spacing).
