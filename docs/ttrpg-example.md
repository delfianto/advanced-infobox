# TTRPG character sheets — a worked example

The [`test-vault`](../test-vault) ships a full **D&D 5e party**: twelve characters, one per
class, levels 5–11, each rendered from a single [`dnd` template](templates.md). No character
note contains any layout configuration — just properties and an empty `` ```infobox `` block.
This page is the guided tour.

![A level-11 wizard's full character sheet rendered as an infobox.](images/nissa-wizard-reading.png)

*Nissa Fizzlewick, rendered entirely from flat frontmatter via `infobox: dnd`.*

## The roster

All twelve live in [`test-vault/Characters/`](../test-vault/Characters):

| Character | Lvl | Class | Casts? | | Character | Lvl | Class | Casts? |
| --- | :-: | --- | :-: | --- | --- | :-: | --- | :-: |
| Gorm Ironhide | 6 | Barbarian | — | | Dame Brannor Emberkin | 10 | Paladin | ✓ |
| Fioravante Sella | 8 | Bard | ✓ | | Sylwen Nightbreeze | 7 | Ranger | ✓ |
| Sister Aldith Vane | 7 | Cleric | ✓ | | Vess Shadowcoin | 8 | Rogue | — |
| Oaken Mossheel | 5 | Druid | ✓ | | Zaraphine Emberscale | 9 | Sorcerer | ✓ |
| Ser Kelryn Dawnbreaker | 9 | Fighter | — | | Corvin Ashthorne | 7 | Warlock | ✓ |
| Kaelen Still-Water | 6 | Monk | — | | Nissa Fizzlewick | 11 | Wizard | ✓ |

## One template, twelve very different sheets

The [`dnd` template](templates.md) lists a *superset* of sheet sections — Identity, Ability
Scores, Combat, Proficiencies & Languages, Spellcasting, Equipment, Personality, Features.
Each character fills in only the properties that apply to them, and the box shows only what's
filled in. The standout is **Spellcasting**: it appears for the eight casters and
[disappears entirely](templates.md#sections-that-hide-themselves) for the four martials —
Barbarian, Fighter, Monk, Rogue — because they simply have no `spell_save_dc`, `cantrips`, or
`spell_slots` keys. Same template, no per-note tweaking.

The half-casters make an even finer point: the Paladin and Ranger *do* cast, but have no
cantrips, so their Spellcasting section shows every row **except** Cantrips. The layout tracks
the data down to the individual field.

## A character page in the wild

Open any character and Reading view floats the sheet beside the note's prose — a proper wiki
article. Here's Dame Brannor with a few paragraphs of backstory wrapping around her sheet:

![A paladin's note in Reading view, infobox floated right, backstory text wrapping to the left.](images/brannor-float-context.png)

While you're editing, Live Preview shows the same sheet as a clean card:

![A monk's sheet as a Live Preview card.](images/kaelen-live-preview.png)

## Reproduce it in your own vault

1. Run **Create sample infobox templates** to write `Templates/Infobox/dnd.md`.
2. Make a note with `infobox: dnd` and run **Add missing template properties to note** to
   scaffold every key, then fill in the values (or just copy a character from the
   [`test-vault`](../test-vault/Characters)).
3. Add an empty `` ```infobox `` block. Done.

Turn on [in-box editing](settings.md#editing) and you can flip `inspiration`, bump a spell
slot, or add a weapon straight from the card.

## From roster to Base

Because these notes are a *folder of uniform, flat-frontmatter records*, they're the ideal
input for an Obsidian **Base** — and the plugin builds one for you. With any character note
open, run **Create base from folder**: it detects the `dnd` template the folder's notes
share and writes a `.base` projecting it onto a **table view** (a roster) and a **cards
view** (a gallery), with the template's labels becoming column names. The generated
[`Characters.base`](../test-vault/Characters/Characters.base) ships in the test-vault.

And it goes the other way too: with **Infobox on hover in Bases** enabled
([setting](settings.md), on by default), hovering a character's name in that table pops the
full sheet — the same infobox, floating over the Base. See
[`PLAN_PHASE4.md` §8.1](../PLAN_PHASE4.md) for the design notes and the one caveat (native
Bases *cards* don't expose a file link, so hover is table-primary).

## See also

- [Templates](templates.md) — how the `dnd` template is put together.
- [Getting started](getting-started.md) — build your first infobox from scratch.
