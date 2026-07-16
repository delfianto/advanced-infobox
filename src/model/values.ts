/**
 * Pure helpers that classify raw frontmatter values into renderable shapes.
 * Nothing in this file may import from "obsidian" — it must stay trivially
 * unit-testable.
 */

export type FieldValue =
  | { kind: "markdown"; markdown: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "date"; iso: string }
  | { kind: "list"; items: FieldValue[] }
  | { kind: "empty" };

/** Obsidian date/datetime property values arrive as ISO-shaped strings. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/u;

export function classifyValue(raw: unknown): FieldValue {
  if (raw === null || raw === undefined) return { kind: "empty" };

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return { kind: "empty" };
    if (ISO_DATE.test(trimmed)) return { kind: "date", iso: trimmed };
    return { kind: "markdown", markdown: trimmed };
  }
  if (typeof raw === "number") return { kind: "number", value: raw };
  if (typeof raw === "boolean") return { kind: "boolean", value: raw };

  if (Array.isArray(raw)) {
    const items = raw.map((item) => classifyValue(item)).filter((v) => v.kind !== "empty");
    return items.length === 0 ? { kind: "empty" } : { kind: "list", items };
  }

  if (raw instanceof Date) {
    return { kind: "date", iso: raw.toISOString().slice(0, 10) };
  }

  // Nested objects are exactly what this plugin exists to avoid; render them
  // as inline code rather than pretending to understand their structure.
  return { kind: "markdown", markdown: `\`${JSON.stringify(raw)}\`` };
}

/** `eye_color` / `eye-color` / `eyeColor` → "Eye Color" */
export function prettifyKey(key: string): string {
  const words = key
    .replaceAll(/(?<tail>[a-z0-9])(?<head>[A-Z])/gu, "$<tail> $<head>")
    .split(/[_\-\s]+/u)
    .filter(Boolean);
  if (words.length === 0) return key;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Accepts string | string[] | nested arrays; strips `#`, dedupes case-insensitively. */
export function normalizeTags(raw: unknown): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) add(item);
      return;
    }
    const parts = String(value)
      .split(/[\s,]+/u)
      .map((t) => t.trim().replace(/^#+/u, ""))
      .filter(Boolean);
    for (const tag of parts) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
  };

  add(raw);
  return tags;
}

/** First string-ish scalar out of a frontmatter value, or undefined. */
export function asDisplayString(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "string") return raw.trim() === "" ? undefined : raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.length > 0 ? asDisplayString(raw[0]) : undefined;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return undefined;
}

/**
 * Every string-ish scalar out of a frontmatter value, in order. A lone scalar
 * yields a one-item list; a list yields all its renderable items (nested lists
 * flattened, blanks dropped). Wikilink/embed syntax is preserved verbatim —
 * bracket and alias stripping is the view's job.
 */
export function asDisplayStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.flatMap((item) => asDisplayStringList(item));
  const single = asDisplayString(raw);
  return single === undefined ? [] : [single];
}
