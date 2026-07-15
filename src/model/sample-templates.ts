/**
 * Starter template notes, created on demand by the "Create sample infobox
 * templates" command. Each demonstrates a mechanism: frontmatter labels,
 * frontmatter-order-only (no body), body sections, and body label overrides.
 */
export const SAMPLE_TEMPLATES: Record<string, string> = {
  person: `---
born: Born
died: Died
nationality: Nationality
occupation: Occupation
known_for: Known for
spouse: Spouse
children: Children
---

## Personal
- born
- died
- nationality

## Career
- occupation
- known_for

## Family
- spouse
- children
`,

  place: `---
country: Country
region: Region
population: Population
area: Area
elevation: Elevation
founded: Founded
---

No body sections: fields render in the frontmatter order above.
`,

  organization: `---
founded: Founded
founder: Founder
headquarters: Headquarters
industry: Industry
employees: Employees
website: Website
---
`,

  character: `---
race: Race
class: Class
level: Level
alignment: Alignment
background: Background
---

## Identity
- race
- class
- level
- alignment
- background

## Ability Scores
- strength
- dexterity
- constitution
- intelligence
- wisdom
- charisma

## Combat
- armor_class: AC
- hit_points: HP
- speed
- proficiency_bonus
- saving_throws
- inspiration

## Loadout
- weapons
- prepared_spells
`,
};
