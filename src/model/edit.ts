/**
 * Pure helpers for in-box property editing. Nothing here imports "obsidian":
 * the write itself (processFrontMatter) lives in the render child, so this
 * module only decides *what* is editable and coerces raw input, and stays
 * trivially unit-testable.
 */
import { type FieldValue } from "src/model/values";

/** Date-only ISO value (no time component) — editable with <input type=date>. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

export function isDateOnly(iso: string): boolean {
  return DATE_ONLY.test(iso);
}

/**
 * Which field values can be edited in place. Scalars (boolean, number, string)
 * and date-only values round-trip cleanly through frontmatter; datetime values
 * (a time component) and lists are left read-only for now.
 */
export function isEditableValue(value: FieldValue): boolean {
  if (value.kind === "date") return isDateOnly(value.iso);
  return value.kind === "boolean" || value.kind === "number" || value.kind === "markdown";
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
