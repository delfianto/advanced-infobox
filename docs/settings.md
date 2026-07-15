# Settings

Every control lives in **Settings → Community plugins → Advanced Infobox**. Settings are
global defaults; a note can override presentation locally with [block options](block-options.md),
and layout with a [template](templates.md).

Values you never touch are left to the theme — the settings tab only writes CSS variables
for values you actually change, so the box follows your theme by default.

## Layout

| Setting | Options (default **bold**) | Notes |
| --- | --- | --- |
| Placement | **Float right** · Float left · Full width | Where the box sits in Reading view; body text wraps around a float. |
| Live Preview presentation | **Full width** · Follow placement | Editor lines can't wrap a floated widget, so Live Preview shows a non-wrapping card. |
| Live Preview collapse | **Disabled** · Start collapsed · Start expanded | Adds a fold toggle on the title while editing. Reading view is always expanded. |
| Remember collapse state | on / **off** | Persist each note's collapse toggle across restarts (session-only when off). |
| Width | slider, **22em** | Box width in em; capped on narrow panes. |
| Font size | slider, **0.9em** | Box text size relative to the note. |
| Density | Compact · **Normal** · Comfortable | Vertical padding inside the box. |
| Visual preset | **Obsidian native** · Wikipedia classic | Native follows your theme; Wikipedia mimics the classic gray card (with a dark-mode variant). See [Theming](theming.md). |

## Field display

| Setting | Default | Notes |
| --- | --- | --- |
| Excluded properties | `tags, aliases, cssclasses, infobox, position` | Frontmatter keys never shown as fields (textarea, one per line or comma-separated). |
| Custom labels | *(empty)* | `key: Label` per line; beats the automatic prettifying (`eye_color` → Eye Color). |
| Label alignment | **Left** · Center · Right | Alignment of the property-name column. |
| List display | **Bulleted list** · Comma-separated · Chips | How array properties render. |
| Checkbox display | **✓ / ✗** · Yes / No | How boolean properties render. |
| Date format | *(empty = as written)* | Moment format for date properties, e.g. `MMMM D, YYYY` → March 14, 1879. |
| Show tags | **on** | Render the note's tags at the bottom of the box. |

## Editing

| Setting | Default | Notes |
| --- | --- | --- |
| Edit properties in infobox | **off** | When on, boolean/number/text/date/list fields become editable in the box; edits write straight to frontmatter via Obsidian's own API. Datetime and nested/object values stay read-only. |

## Bases

Run **Create base from folder** from the command palette to generate an Obsidian
[Base](https://help.obsidian.md/bases) (a table view + a cards view) from the notes in the
active note's folder, using their detected [template](templates.md). See the
[TTRPG example](ttrpg-example.md#from-roster-to-base).

| Setting | Default | Notes |
| --- | --- | --- |
| Infobox on hover in Bases | **on** | Show a note's infobox in a popover when you hover a link to it inside a Base (e.g. a table's file-name column). Best-effort — reads Bases' rendered markup, so it does nothing without Bases. Native cards don't expose a file link, so hover is table-primary. |
| Infobox view in Bases | **off** | Adds an "Infobox" view type to Bases that renders each entry as its full infobox (a gallery) — pick it from a Base's view menu. Needs Obsidian 1.10+; reload to fully apply a change. |

## Templates

| Setting | Default | Notes |
| --- | --- | --- |
| Template folder | `Templates/Infobox` | Vault folder holding [template notes](templates.md); the note name is the template id. |
| Template property | `infobox` | The frontmatter key a note uses to name its template (e.g. `infobox: dnd`). |

## Special keys

Which frontmatter properties feed the infobox header. Change these if your vault uses
different names (e.g. `cover` instead of `image`). Special keys are never shown as ordinary
fields.

| Setting | Default |
| --- | --- |
| Title property | `title` |
| Subtitle property | `subtitle` |
| Image property | `image` |
| Caption property | `caption` |

## Reset

**Reset to defaults** (two-click confirm) restores every setting above to its default.
