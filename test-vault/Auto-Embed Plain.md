---
infobox: true
title: Auto-Embedded Note
subtitle: No anchor block anywhere
kind: Demo
status: Working
priority: 1
featured: true
related:
  - "[[Albert Einstein]]"
tags:
  - demo
  - auto-embed
---

This note has **no** infobox code block — the box above is auto-embedded because
`infobox: true` is set and the Auto-embed setting is on. In Reading view it should
float to the right with this paragraph wrapping around it; in Live Preview it sits as
a card just below the Properties panel.

Turn the Auto-embed setting off (or set `infobox: false`) and the box disappears while
every property here stays untouched — the frontmatter remains the single source of truth.
