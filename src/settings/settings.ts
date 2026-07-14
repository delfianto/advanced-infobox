export type Placement = "right" | "left" | "full";
export type LivePreviewPresentation = "full-width" | "aligned";
export type ArrayStyle = "comma" | "chips";

export interface InfoboxSettings {
  placement: Placement;
  livePreview: LivePreviewPresentation;
  /** CSS length, e.g. "22em" */
  width: string;
  /** CSS length, e.g. "0.9em" */
  fontSize: string;
  /** Frontmatter keys never rendered as fields. */
  excludeKeys: string[];
  arrayStyle: ArrayStyle;
  showTags: boolean;
  titleKey: string;
  subtitleKey: string;
  imageKey: string;
  captionKey: string;
}

export const DEFAULT_SETTINGS: InfoboxSettings = {
  placement: "right",
  livePreview: "full-width",
  width: "22em",
  fontSize: "0.9em",
  excludeKeys: ["tags", "aliases", "cssclasses", "infobox", "position"],
  arrayStyle: "comma",
  showTags: true,
  titleKey: "title",
  subtitleKey: "subtitle",
  imageKey: "image",
  captionKey: "caption",
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
  return /^[\w.%-]+$/.test(trimmed) && /^\d/.test(trimmed) ? trimmed : fallback;
}

export function parseKeyList(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}
