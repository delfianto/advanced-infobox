export type Placement = "right" | "left" | "full";
export type LivePreviewPresentation = "full-width" | "aligned";
export type ArrayStyle = "list" | "comma" | "chips";
export type TextAlign = "left" | "center" | "right";
export type BooleanStyle = "check" | "yes-no";
export type LpCollapse = "off" | "expanded" | "collapsed";
export type Density = "compact" | "normal" | "comfortable";
export type VisualPreset = "native" | "wikipedia";

export interface InfoboxSettings {
  placement: Placement;
  livePreview: LivePreviewPresentation;
  /**
   * Collapsible card in Live Preview: off, or collapsible starting
   * expanded/collapsed. Reading view always renders expanded.
   */
  lpCollapse: LpCollapse;
  /** Persist per-note collapse toggles across restarts (session-only when off). */
  lpCollapseRemember: boolean;
  /** CSS length, e.g. "22em" */
  width: string;
  /** CSS length, e.g. "0.9em" */
  fontSize: string;
  /** Frontmatter keys never rendered as fields. */
  excludeKeys: string[];
  arrayStyle: ArrayStyle;
  /** Alignment of the property-label column (Race, Class, …). */
  labelAlign: TextAlign;
  /** Custom key → display label overrides (beats auto-prettifying). */
  labelMap: Record<string, string>;
  booleanStyle: BooleanStyle;
  /** Moment format for date-like values; empty = show as written. */
  dateFormat: string;
  density: Density;
  visualPreset: VisualPreset;
  showTags: boolean;
  /**
   * In-box editing: make boolean and number fields directly editable, writing
   * straight to frontmatter via processFrontMatter. Opt-in; text, date, and
   * list fields stay read-only for now.
   */
  editInBox: boolean;
  titleKey: string;
  subtitleKey: string;
  imageKey: string;
  captionKey: string;
  /** Frontmatter property that names a template note (flat string). */
  templateKey: string;
  /** Vault folder holding template notes; basename = template id. */
  templateFolder: string;
  /**
   * Show a note's infobox in a floating popover when hovering a link to it
   * inside an Obsidian Base (e.g. a table's file-name column). Best-effort —
   * reads Bases' rendered DOM.
   */
  basesHoverPreview: boolean;
  /**
   * Register an "Infobox" view type in Obsidian Bases that renders each entry
   * as its full infobox (a gallery of cards). Opt-in; needs Obsidian 1.10+.
   */
  basesInfoboxView: boolean;
  /**
   * Override Obsidian's global "Readable line length" for notes that contain
   * an infobox or an embedded Base — both read better full-width than
   * clamped to prose width. Leaves ordinary notes alone.
   */
  wideNotes: boolean;
  /** CSS length cap for wide notes; empty = fully unconstrained (edge-to-edge). */
  wideNoteWidth: string;
}

export const DEFAULT_SETTINGS: InfoboxSettings = {
  placement: "right",
  livePreview: "full-width",
  lpCollapse: "off",
  lpCollapseRemember: false,
  width: "22em",
  fontSize: "0.9em",
  excludeKeys: ["tags", "aliases", "cssclasses", "infobox", "position"],
  arrayStyle: "list",
  labelAlign: "left",
  labelMap: {},
  booleanStyle: "check",
  dateFormat: "",
  density: "normal",
  visualPreset: "native",
  showTags: true,
  editInBox: false,
  titleKey: "title",
  subtitleKey: "subtitle",
  imageKey: "image",
  captionKey: "caption",
  templateKey: "infobox",
  templateFolder: "Templates/Infobox",
  basesHoverPreview: true,
  basesInfoboxView: false,
  wideNotes: true,
  wideNoteWidth: "",
};

export const PLACEMENTS: readonly Placement[] = ["right", "left", "full"];
export const LIVE_PREVIEW_PRESENTATIONS: readonly LivePreviewPresentation[] = [
  "full-width",
  "aligned",
];

/**
 * Values interpolated into the settings-driven stylesheet. Anything outside
 * this conservative charset falls back to the default rather than risking a
 * broken (or escaped-out-of) CSS declaration.
 */
export function sanitizeCssLength(value: string, fallback: string): string {
  const trimmed = value.trim();
  return /^[\w.%-]+$/u.test(trimmed) && /^\d/u.test(trimmed) ? trimmed : fallback;
}

export function parseKeyList(raw: string): string[] {
  return raw
    .split(/[\n,]/u)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * One `key: Label` pair per line, e.g.
 *
 *   hp: Hit Points
 *   armor_class: AC
 *
 * Lines without a colon (or with an empty side) are ignored.
 */
export function parseLabelMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const label = line.slice(colonIdx + 1).trim();
    if (key && label) map[key] = label;
  }
  return map;
}

export function serializeLabelMap(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([key, label]) => `${key}: ${label}`)
    .join("\n");
}
