---
title: Left Placement
kind: Demo
purpose: Shows per-note placement override
---

```infobox
placement: left
exclude: purpose
```

This note overrides the global placement with `placement: left` in the anchor block, and hides the `purpose` property with a per-note exclude. In Reading view the text of this paragraph should wrap around the right side of the box.

Only presentation lives in the block. Deleting the whole block loses nothing but the infobox itself — the properties above survive untouched, still editable in the Properties panel, still visible to Dataview and Bases.
