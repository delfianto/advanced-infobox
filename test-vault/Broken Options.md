---
title: Broken Options
kind: Demo
purpose: Shows friendly errors for bad block options
---

```infobox
placement: center
mystery: value
```

The block above contains an invalid placement (`center`) and an unknown option (`mystery`). The infobox still renders from frontmatter — with inline warnings explaining both problems — because breaking the presentation block can never lose data.
