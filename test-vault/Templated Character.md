---
title: Templated Character
subtitle: Uses the character template note
infobox: character
race: "[[Half-Elf]]"
class: "[[Bard]]"
level: 5
alignment: Chaotic Good
strength: 10
dexterity: 14
constitution: 12
charisma: 18
armor_class: 14
hit_points: 33
inspiration: true
weapons:
  - Rapier
  - Dagger
favorite_song: The Ballad of the Broken Anvil
---

```infobox
```

This note carries **no sections in its anchor block** — the structure comes from
`Templates/Infobox/character.md`, selected by the flat `infobox: character` property.
Section layout, order, and label overrides (AC, HP) live once in the template and apply
to every character note.

`favorite_song` is not named by the template, so it lands in the unlabeled group at the
bottom (the template could hide extras with `unlisted: hide` in its frontmatter). Edit the
template note — rename a section, reorder keys — and this infobox updates live.
