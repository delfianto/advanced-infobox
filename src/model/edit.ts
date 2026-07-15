/**
 * Pure helpers for in-box property editing. Nothing here imports "obsidian":
 * the write itself (processFrontMatter) lives in the render child, so this
 * module only decides *what* is editable and coerces raw input, and stays
 * trivially unit-testable.
 */
import { type FieldValue } from "src/model/values";

/**
 * v1 edits only scalar booleans and numbers. They round-trip through YAML with
 * no quoting hazard (unlike strings that look like dates, or `[[wikilinks]]`)
 * and are unambiguous to write back. Strings, dates, and lists come later.
 */
export function isEditableValue(value: FieldValue): boolean {
  return value.kind === "boolean" || value.kind === "number";
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
