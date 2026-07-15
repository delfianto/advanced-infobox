/**
 * Pure parsing of an infobox template note (see docs/research-notes.md §3.2).
 *
 * A template is an ordinary markdown note: its frontmatter maps property
 * keys to display labels (key order = display order), and its body may add
 * wiki-style sections — headings become section headers, top-level list
 * items beneath them name the keys (`- key` or `- key: Label`).
 *
 * This module never imports "obsidian": the registry hands it structural
 * data extracted from the metadata cache, so everything here is trivially
 * unit-testable and there is no hand-rolled markdown parsing — offsets come
 * from Obsidian's own parser.
 */

export interface TemplateSectionSpec {
  /** Absent for keys listed before the first heading. */
  label?: string;
  keys: string[];
}

export interface InfoboxTemplate {
  id: string;
  /** key → display label overrides from the template's frontmatter. */
  labels: Record<string, string>;
  /** Frontmatter key order — the display order when the body has no sections. */
  order: string[];
  /** Sections from the body; empty means "use `order`, no sections". */
  sections: TemplateSectionSpec[];
  /** What happens to data-note keys the template does not name. */
  unlisted?: "show" | "hide";
}

/** Frontmatter keys with reserved meaning inside a template note. */
const RESERVED_KEYS = new Set(["unlisted"]);

export interface TemplateHeading {
  text: string;
  /** Absolute file offset where the heading starts. */
  offset: number;
}

export interface TemplateListItem {
  start: number;
  end: number;
  /** Obsidian list item parent: negative for top-level items. */
  parent: number;
}

export interface TemplateSource {
  id: string;
  frontmatter: Record<string, unknown> | undefined;
  headings: TemplateHeading[];
  listItems: TemplateListItem[];
  /** Full file text; list item text is sliced out of it by offset. */
  body: string;
}

/** `- key: Label` → { key, label }; `- [[key]]` → { key }. */
function parseItemText(raw: string): { key: string; label?: string } | null {
  // First line only (list items may wrap), bullet/checkbox stripped.
  const text = raw
    .split("\n")[0]
    .replace(/^\s*[-*+]\s*(?:\[.\]\s+)?/u, "")
    .trim();
  if (text === "") return null;

  const colonIdx = text.indexOf(":");
  const keyPart = (colonIdx === -1 ? text : text.slice(0, colonIdx)).trim();
  const labelPart = colonIdx === -1 ? "" : text.slice(colonIdx + 1).trim();

  const key = keyPart.replace(/^\[\[(?<inner>.+)\]\]$/u, "$<inner>").trim();
  if (key === "") return null;
  return labelPart === "" ? { key } : { key, label: labelPart };
}

export function parseTemplate(source: TemplateSource): InfoboxTemplate {
  const labels: Record<string, string> = {};
  const order: string[] = [];
  let unlisted: "show" | "hide" | undefined;

  for (const [key, value] of Object.entries(source.frontmatter ?? {})) {
    if (RESERVED_KEYS.has(key)) {
      if (key === "unlisted" && (value === "show" || value === "hide")) unlisted = value;
      continue;
    }
    order.push(key);
    if (typeof value === "string" && value.trim() !== "") labels[key] = value.trim();
  }

  // Assign each top-level list item to the closest heading above it.
  const headings = [...source.headings].toSorted((a, b) => a.offset - b.offset);
  const sections: TemplateSectionSpec[] = [];
  const sectionFor = (offset: number): TemplateSectionSpec => {
    let label: string | undefined;
    for (const heading of headings) {
      if (heading.offset > offset) break;
      label = heading.text;
    }
    const last = sections.at(-1);
    if (last && last.label === label) return last;
    const created: TemplateSectionSpec = label === undefined ? { keys: [] } : { label, keys: [] };
    sections.push(created);
    return created;
  };

  const items = [...source.listItems]
    .filter((item) => item.parent < 0)
    .toSorted((a, b) => a.start - b.start);
  for (const item of items) {
    const parsed = parseItemText(source.body.slice(item.start, item.end));
    if (!parsed) continue;
    const section = sectionFor(item.start);
    section.keys.push(parsed.key);
    if (parsed.label) labels[parsed.key] = parsed.label;
  }

  return {
    id: source.id,
    labels,
    order,
    sections: sections.filter((s) => s.keys.length > 0),
    unlisted,
  };
}
