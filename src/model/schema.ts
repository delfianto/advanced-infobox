import type { BlockConfig } from "src/model/block-config";
import type { InfoboxSettings } from "src/settings/settings";
import {
  asDisplayString,
  classifyValue,
  normalizeTags,
  prettifyKey,
  type FieldValue,
} from "src/model/values";

/**
 * The renderable shape of an infobox, derived from a note's flat frontmatter.
 * Pure data: image is carried as its *raw* frontmatter spec (wikilink, vault
 * path, or URL) and resolved to a resource URL by the view layer, keeping
 * this module free of the Obsidian runtime.
 */
export interface InfoboxViewModel {
  title: string;
  subtitle?: string;
  image?: string;
  caption?: string;
  tags: string[];
  /**
   * Fields grouped wiki-style. Without section config there is a single
   * unlabeled section holding every field in file order; ungrouped leftovers
   * always land in a trailing unlabeled section.
   */
  sections: InfoboxSection[];
  /** True when the note has no frontmatter at all (renders a gentle hint). */
  bare: boolean;
}

export interface InfoboxSection {
  label?: string;
  fields: InfoboxField[];
}

export interface InfoboxField {
  key: string;
  label: string;
  value: FieldValue;
}

export interface ViewModelInput {
  frontmatter: Record<string, unknown> | undefined;
  fileBasename: string;
  settings: InfoboxSettings;
  blockConfig: BlockConfig;
}

export function buildViewModel(input: ViewModelInput): InfoboxViewModel {
  const { frontmatter, fileBasename, settings, blockConfig } = input;

  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return {
      title: fileBasename,
      tags: [],
      sections: [],
      bare: true,
    };
  }

  const specialKeys = new Set([
    settings.titleKey,
    settings.subtitleKey,
    settings.imageKey,
    settings.captionKey,
    "tags",
  ]);
  const excluded = new Set(
    [...settings.excludeKeys, ...(blockConfig.exclude ?? [])].map((k) => k.toLowerCase()),
  );

  const labelOverrides = new Map(
    Object.entries(settings.labelMap).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const labelFor = (key: string): string =>
    labelOverrides.get(key.toLowerCase()) ?? prettifyKey(key);

  // Insertion order mirrors the file; sections consume from this pool.
  const pool = new Map<string, InfoboxField>();
  for (const key of Object.keys(frontmatter)) {
    if (specialKeys.has(key) || excluded.has(key.toLowerCase())) continue;
    const value = classifyValue(frontmatter[key]);
    if (value.kind === "empty") continue;
    pool.set(key, { key, label: labelFor(key), value });
  }

  const takeField = (wanted: string): InfoboxField | undefined => {
    const exact = pool.get(wanted);
    if (exact) {
      pool.delete(wanted);
      return exact;
    }
    const lower = wanted.toLowerCase();
    for (const [key, field] of pool) {
      if (key.toLowerCase() === lower) {
        pool.delete(key);
        return field;
      }
    }
    return undefined;
  };

  const sections: InfoboxSection[] = [];
  for (const spec of blockConfig.sections ?? []) {
    const fields: InfoboxField[] = [];
    for (const wanted of spec.keys) {
      const field = takeField(wanted);
      if (field) fields.push(field);
    }
    // A section whose keys are all absent from this note renders nothing —
    // section specs may be shared across notes with differing properties.
    if (fields.length > 0) sections.push({ label: spec.label, fields });
  }

  if (pool.size > 0 && blockConfig.unlisted !== "hide") {
    sections.push({ fields: [...pool.values()] });
  }

  return {
    title: asDisplayString(frontmatter[settings.titleKey]) ?? fileBasename,
    subtitle: asDisplayString(frontmatter[settings.subtitleKey]),
    image: blockConfig.image ?? asDisplayString(frontmatter[settings.imageKey]),
    caption: blockConfig.caption ?? asDisplayString(frontmatter[settings.captionKey]),
    tags: settings.showTags ? normalizeTags(frontmatter["tags"]) : [],
    sections,
    bare: false,
  };
}
