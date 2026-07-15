import character from "src/templates/character.md?raw";
import cyberpunk from "src/templates/cyberpunk.md?raw";
import dnd from "src/templates/dnd.md?raw";
import organization from "src/templates/organization.md?raw";
import person from "src/templates/person.md?raw";
import place from "src/templates/place.md?raw";
import wod from "src/templates/wod.md?raw";

/**
 * Starter template notes, created on demand by the "Create sample infobox
 * templates" command. Authored as real markdown files in src/templates/
 * (bundled at build time via vite's ?raw imports) so they are editable,
 * diffable, and previewable like any other note.
 *
 * person/place/organization/character demonstrate the mechanisms
 * (frontmatter labels, order-only, body sections, body label overrides);
 * dnd/cyberpunk/wod are ready-to-use TTRPG character sheets.
 */
export const SAMPLE_TEMPLATES: Record<string, string> = {
  person,
  place,
  organization,
  character,
  dnd,
  cyberpunk,
  wod,
};
