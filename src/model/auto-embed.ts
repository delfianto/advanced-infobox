import { type InfoboxSettings } from "src/settings/settings";

/**
 * Auto-embed renders an infobox at the top of a note with no ```infobox```
 * anchor block. The trigger is the note carrying the template property
 * (`settings.templateKey`, `infobox` by default) set to a truthy value:
 *
 *   infobox: person   → auto-embed, using the `person` template
 *   infobox: true     → auto-embed, no template
 *   infobox: false    → explicit per-note opt-out (also: no, off, empty)
 *
 * Reusing the template property keeps a single, intuitive knob: the same
 * `infobox:` line that already names a template now also turns the box on.
 * Everything here is pure so it can be unit-tested without the Obsidian
 * runtime; the view layer supplies the frontmatter and document source.
 */

/**
 * Class on every auto-embedded container, in both view modes. Doubles as the
 * reading-view "already injected this render" marker, so the two paths must
 * agree on it — hence one shared constant.
 */
export const AUTO_EMBED_CLASS = "aib-auto-embed";

/** True when a trigger-property value asks for an auto-embedded infobox. */
export function isAutoEmbedTrigger(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v !== "" && v !== "false" && v !== "no" && v !== "off" && v !== "0";
  }
  // null, undefined, lists, objects: not a deliberate "yes".
  return false;
}

/** Whether a note's frontmatter qualifies it for an auto-embedded infobox. */
export function qualifiesForAutoEmbed(
  frontmatter: Record<string, unknown> | undefined,
  settings: Pick<InfoboxSettings, "autoEmbed" | "templateKey">,
): boolean {
  if (!settings.autoEmbed || !frontmatter) return false;
  return isAutoEmbedTrigger(frontmatter[settings.templateKey]);
}

/**
 * Matches a fenced ```infobox``` (or ~~~infobox) block anywhere in a note's
 * source. Case-insensitive and tolerant of indentation / longer fences so we
 * err toward *detecting* an anchor — over-detection merely defers to the
 * block, whereas a miss would double-render. `\b` keeps `infoboxes` from
 * matching; the language token is the first word after the fence.
 */
const INFOBOX_FENCE = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*infobox\b/imu;

/** True when the note already places an infobox with an explicit block. */
export function hasInfoboxAnchor(source: string): boolean {
  return INFOBOX_FENCE.test(source);
}
