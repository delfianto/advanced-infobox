import { parseYaml } from "obsidian";
import { PLACEMENTS, type Placement } from "src/settings/settings";

/**
 * Per-note, presentation-only overrides carried in the body of the
 * ```infobox``` anchor block. This never contains data — breaking it can
 * only ever degrade styling, and every problem is reported as a friendly
 * inline message instead of a silent failure.
 */
export interface BlockConfig {
  placement?: Placement;
  exclude?: string[];
  image?: string;
  caption?: string;
  /** Wiki-style groupings: header rows above the listed property keys. */
  sections?: SectionSpec[];
  /** What happens to properties no section names. Default: shown at the end. */
  unlisted?: "show" | "hide";
  /** Parsed and validated now; consumed by the template phase. */
  template?: string;
}

export interface SectionSpec {
  label: string;
  keys: string[];
}

export interface BlockConfigResult {
  config: BlockConfig;
  errors: string[];
}

const KNOWN_KEYS = new Set([
  "placement",
  "exclude",
  "image",
  "caption",
  "sections",
  "unlisted",
  "template",
]);

function asStringList(value: unknown): string[] | undefined {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value.map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

/**
 * Accepts the natural mapping form:
 *
 *   sections:
 *     Identity: [race, class]
 *     Combat: armor_class, hit_points
 *
 * and the explicit list form (which preserves order even for numeric-looking
 * labels, where JS object iteration would reorder the mapping form):
 *
 *   sections:
 *     - Identity: [race, class]
 */
function asSections(value: unknown, errors: string[]): SectionSpec[] | undefined {
  const specs: SectionSpec[] = [];

  const addEntry = (label: string, keys: unknown): void => {
    const list = asStringList(keys);
    if (!list || list.length === 0) {
      errors.push(`Section \`${label}\` needs a list of property names.`);
      return;
    }
    specs.push({ label, keys: list });
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        errors.push("Each section must be a `Label: keys` entry.");
        continue;
      }
      const entries = Object.entries(item as Record<string, unknown>);
      if (entries.length !== 1) {
        errors.push("Each section entry must have exactly one `Label: keys` pair.");
        continue;
      }
      addEntry(entries[0][0], entries[0][1]);
    }
    return specs;
  }

  if (value !== null && typeof value === "object") {
    for (const [label, keys] of Object.entries(value as Record<string, unknown>)) {
      addEntry(label, keys);
    }
    return specs;
  }

  errors.push("Invalid `sections` (expected `Label: keys` entries).");
  return undefined;
}

export function parseBlockConfig(source: string): BlockConfigResult {
  const config: BlockConfig = {};
  const errors: string[] = [];

  if (source.trim() === "") return { config, errors };

  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (err) {
    errors.push(`Could not parse infobox options: ${err instanceof Error ? err.message : err}`);
    return { config, errors };
  }

  if (raw === null || raw === undefined) return { config, errors };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("Infobox options must be `key: value` lines (got " + typeof raw + ").");
    return { config, errors };
  }

  const entries = raw as Record<string, unknown>;

  for (const key of Object.keys(entries)) {
    if (!KNOWN_KEYS.has(key)) {
      errors.push(`Unknown option \`${key}\` (expected one of: ${[...KNOWN_KEYS].join(", ")}).`);
    }
  }

  const placement = entries["placement"];
  if (placement !== undefined) {
    if (typeof placement === "string" && (PLACEMENTS as readonly string[]).includes(placement)) {
      config.placement = placement as Placement;
    } else {
      errors.push(`Invalid placement \`${placement}\` (expected ${PLACEMENTS.join(", ")}).`);
    }
  }

  const exclude = entries["exclude"];
  if (exclude !== undefined) {
    const list = asStringList(exclude);
    if (list) {
      config.exclude = list;
    } else {
      errors.push(
        "Invalid `exclude` (expected a list of property names or a comma-separated string).",
      );
    }
  }

  const sections = entries["sections"];
  if (sections !== undefined) {
    const specs = asSections(sections, errors);
    if (specs && specs.length > 0) config.sections = specs;
  }

  const unlisted = entries["unlisted"];
  if (unlisted !== undefined) {
    if (unlisted === "show" || unlisted === "hide") {
      config.unlisted = unlisted;
    } else {
      errors.push(`Invalid \`unlisted\` (expected show or hide).`);
    }
  }

  for (const key of ["image", "caption", "template"] as const) {
    const value = entries[key];
    if (value !== undefined) {
      if (typeof value === "string" && value.trim() !== "") {
        config[key] = value.trim();
      } else {
        errors.push(`Invalid \`${key}\` (expected non-empty text).`);
      }
    }
  }

  return { config, errors };
}
