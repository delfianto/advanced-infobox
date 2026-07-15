/**
 * Pure helpers for in-box property editing. Nothing here imports "obsidian":
 * the write itself (processFrontMatter) lives in the render child, so this
 * module only decides *what* is editable and coerces raw input, and stays
 * trivially unit-testable.
 */
import { type FieldValue } from "src/model/values";

/** A single frontmatter scalar. */
export type Scalar = string | number | boolean;

/** A frontmatter value the box can write back: a scalar, or a list of scalars. */
export type EditableValue = Scalar | Scalar[];

/** Date-only ISO value (no time component) — editable with <input type=date>. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

export function isDateOnly(iso: string): boolean {
  return DATE_ONLY.test(iso);
}

function isScalarItem(item: FieldValue): boolean {
  return (
    item.kind === "number" ||
    item.kind === "boolean" ||
    item.kind === "markdown" ||
    item.kind === "date"
  );
}

/**
 * Which field values can be edited in place. Scalars (boolean, number, string)
 * and date-only values round-trip cleanly; a list is editable when every item
 * is a scalar. Datetime values (a time component) and lists holding nested
 * arrays/objects stay read-only.
 */
export function isEditableValue(value: FieldValue): boolean {
  if (value.kind === "date") return isDateOnly(value.iso);
  if (value.kind === "list") return value.items.every((item) => isScalarItem(item));
  return value.kind === "boolean" || value.kind === "number" || value.kind === "markdown";
}

/** The editable text for a classified list item (inverse of classifyValue). */
export function listItemText(item: FieldValue): string {
  if (item.kind === "number") return String(item.value);
  if (item.kind === "boolean") return String(item.value);
  if (item.kind === "markdown") return item.markdown;
  if (item.kind === "date") return item.iso;
  return "";
}

/**
 * Interprets an edited list-item string as the scalar it represents, mirroring
 * how YAML types a bare value: `true`/`false` → boolean, a canonical number
 * string → number, anything else → the trimmed string. Empty/whitespace returns
 * null so the caller can drop the row.
 */
export function coerceScalar(raw: string): Scalar | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const num = Number(trimmed);
  if (Number.isFinite(num) && String(num) === trimmed) return num;
  return trimmed;
}

/**
 * Parses a number `<input>`'s string value. Rejects empty/whitespace and
 * anything non-finite (NaN, Infinity) so a bad edit is refused rather than
 * writing garbage to frontmatter.
 */
export function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
