# Block options

The infobox is rendered by an anchor block you drop into a note's body:

````markdown
```infobox
```
````

An empty block is the common case — it renders the note's frontmatter using your global
settings (and a [template](templates.md), if the note names one). The block also accepts a
few **presentation-only** options for overrides that should apply to *this note only*.

> **The block never carries data.** Every value shown in the box comes from the note's
> frontmatter. Block options only change *presentation* (placement, which keys show, how
> they're grouped). Breaking or deleting the block can never lose data — the worst case is
> a note with no infobox.

## Options

| Option | Type | Effect |
| --- | --- | --- |
| `placement` | `right` \| `left` \| `full` | Where the box floats in Reading view, overriding the global setting for this note. |
| `exclude` | list of keys | Hide these frontmatter keys in this note (added to the global excluded list). |
| `image` | string | Override the image property (a wikilink, vault path, or URL) for this note. |
| `caption` | string | Override the caption shown under the image. |
| `sections` | map of `Label: [keys]` | Group fields into wiki-style header rows (see below). |
| `unlisted` | `show` \| `hide` | What to do with keys no section names. Default `show` (they land in a trailing unlabeled group). |
| `template` | template id | Use a [template note](templates.md) for this note, as if its frontmatter said so. |

## Sections in the block

`sections` is the inline equivalent of a template's body sections — handy for a one-off
layout without creating a template note:

````markdown
```infobox
sections:
  Identity: [race, class, level, alignment]
  Combat: [armor_class, hit_points, speed]
  Loadout: [weapons]
unlisted: hide
```
````

Each `Label: [keys]` entry becomes a header row spanning both columns, with the listed
properties beneath it in the given order. A key that the note doesn't have is simply
skipped, and a section whose keys are *all* absent renders nothing.

## Precedence

When more than one source defines structure, the most specific wins:

```
block sections  >  template body sections  >  template frontmatter order  >  zero-config
```

So a `sections:` block overrides the note's template for this note only, and `unlisted` in
the block overrides the template's `unlisted`.

## Malformed options

If the block's YAML is malformed (a bad indent, an unclosed bracket), the box renders a
friendly inline warning instead of failing silently — and your frontmatter is never
touched. Fix the block and it re-renders.

## See also

- [Templates](templates.md) — make a layout reusable instead of repeating `sections:` in every note.
- [Settings](settings.md) — the global defaults these options override.
