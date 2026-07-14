---
image: "[[missing-cover.png]]"
status: In progress
priority: 2
reviewed: false
related:
  - "[[Albert Einstein]]"
  - some plain text
empty_value: ""
camelCaseKey: works too
tags: project, testing
---

```infobox
```

This note has no `title` property, so the infobox falls back to the filename. The image wikilink points at a file that does not exist, which exercises the missing-image state. Everything else is rendered zero-config, in file order, with prettified labels.

The `empty_value` property should not produce a blank row, and `tags` given as a comma-separated string should still render as chips at the bottom.
