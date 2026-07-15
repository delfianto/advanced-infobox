/**
 * Pure builder for the contents of an Obsidian Base (`.base`) file, generated
 * from a folder of infobox notes (see PLAN_PHASE4.md §8.1). Never imports
 * "obsidian": the caller serializes the returned object with `stringifyYaml`
 * and writes it, keeping this trivially unit-testable.
 *
 * The output mirrors Obsidian's `BasesConfigFile` shape, plus the cards-view
 * display keys (`title`, `image`, `cardSize`, `imageAspectRatio`) that the
 * cards renderer reads but that aren't in the minimal published interface.
 */
import { type InfoboxTemplate } from "src/model/template";
import { prettifyKey } from "src/model/values";

export type BaseFilter =
  | string
  | { and: BaseFilter[] }
  | { or: BaseFilter[] }
  | { not: BaseFilter[] };

export interface BaseSort {
  property: string;
  direction: "ASC" | "DESC";
}

export interface BaseView {
  type: "table" | "cards";
  name: string;
  order: string[];
  sort: BaseSort[];
  /** cards only — property whose value is the card heading. */
  title?: string;
  /** cards only — property holding the cover image. */
  image?: string;
  /** cards only — card width in px. */
  cardSize?: number;
  /** cards only — cover aspect ratio. */
  imageAspectRatio?: number;
}

export interface BaseConfig {
  filters?: BaseFilter;
  properties?: Record<string, { displayName: string }>;
  views: BaseView[];
}

export interface BaseGenInput {
  /** Vault-relative folder the base is scoped to (no trailing slash; "" = vault root). */
  folder: string;
  /** Resolved template that shapes columns and labels, or null. */
  template: InfoboxTemplate | null;
  /** Frontmatter key that selects a template (e.g. "infobox"). */
  templateKey: string;
  /** Template id the folder's notes use, or null when none was detected. */
  templateId: string | null;
  /** Special key whose value is a card's heading. */
  titleKey: string;
  /** Special key holding a note's cover image. */
  imageKey: string;
  /** True if any note in the folder carries the image key (else no cover is shown). */
  hasImages: boolean;
  /** Union of field keys across the folder — used to pick columns when there is no template. */
  fallbackKeys: string[];
}

/** Columns beyond file.name in the table view; card fields in the cards view. */
const MAX_TABLE_COLUMNS = 8;
const MAX_CARD_FIELDS = 4;

const noteRef = (key: string): string => `note.${key}`;
const nameSort = (): BaseSort[] => [{ property: "file.name", direction: "ASC" }];

/**
 * The headline keys a view leads with: a template's first section, else its
 * frontmatter order, else the keys seen across the folder. Kept short — the
 * user widens the base in Obsidian; a 30-column table helps no one.
 */
function headlineKeys(input: BaseGenInput): string[] {
  const { template, fallbackKeys } = input;
  if (!template) return fallbackKeys;
  const [firstSection] = template.sections;
  if (firstSection && firstSection.keys.length > 0) return firstSection.keys;
  if (template.order.length > 0) return template.order;
  return template.sections.flatMap((s) => s.keys);
}

export function buildBaseConfig(input: BaseGenInput): BaseConfig {
  const { folder, template, templateKey, templateId, titleKey, imageKey, hasImages } = input;

  // Scope: to the folder, and to the template property when one was detected.
  const clauses: BaseFilter[] = [];
  if (folder) clauses.push(`file.inFolder("${folder}")`);
  if (templateId) clauses.push(`note.${templateKey} == "${templateId}"`);
  let filters: BaseFilter | undefined;
  if (clauses.length > 1) filters = { and: clauses };
  else [filters] = clauses;

  const keys = headlineKeys(input);
  const tableKeys = keys.slice(0, MAX_TABLE_COLUMNS);
  const cardKeys = keys.slice(0, MAX_CARD_FIELDS);

  // Bases shows a column's raw property id (e.g. "armor_class") unless a
  // displayName is set — it does not auto-prettify. So name every shown key
  // (template label, else prettified), and also carry the template's overrides
  // so any column the user adds later still reads right.
  const named = (key: string): string => template?.labels[key] ?? prettifyKey(key);
  const properties: Record<string, { displayName: string }> = {};
  for (const key of new Set([...tableKeys, ...cardKeys])) {
    properties[noteRef(key)] = { displayName: named(key) };
  }
  for (const [key, label] of Object.entries(template?.labels ?? {})) {
    if (label && label !== prettifyKey(key)) properties[noteRef(key)] = { displayName: label };
  }

  const table: BaseView = {
    type: "table",
    name: "Table",
    order: ["file.name", ...tableKeys.map((key) => noteRef(key))],
    sort: nameSort(),
  };

  const cards: BaseView = {
    type: "cards",
    name: "Cards",
    order: cardKeys.map((key) => noteRef(key)),
    sort: nameSort(),
    title: noteRef(titleKey),
    cardSize: 260,
  };
  if (hasImages) {
    cards.image = noteRef(imageKey);
    cards.imageAspectRatio = 1;
  }

  const config: BaseConfig = { views: [table, cards] };
  if (filters !== undefined) config.filters = filters;
  if (Object.keys(properties).length > 0) config.properties = properties;
  return config;
}
