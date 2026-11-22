import {
  asDisplayString,
  asDisplayStringList,
  classifyValue,
  type FieldValue,
  normalizeTags,
  prettifyKey,
} from "src/model/values";
import { type BlockConfig } from "src/model/block-config";
import { type InfoboxSettings } from "src/settings/settings";
import { type InfoboxTemplate } from "src/model/template";

/**
 * The renderable shape of an infobox, derived from a note's flat frontmatter.
 * Pure data: images are carried as their *raw* frontmatter specs (wikilink,
 * vault path, or URL) and resolved to resource URLs by the view layer, keeping
 * this module free of the Obsidian runtime. `images` is empty when the note has
 * no image; a single image is just a one-item list.
 */
export interface InfoboxViewModel {
  title: string;
  subtitle?: string;
  images: string[];
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
  /** Resolved template note, when the note (or block) names one. */
  template?: InfoboxTemplate | null;
}

export function getTemplateId(
  frontmatter: Record<string, unknown> | undefined,
  key: string,
  block: BlockConfig,
): string | undefined {
  const value = frontmatter?.[key];
  return block.template ?? (typeof value === "string" ? value.trim() : undefined);
}

export function resolveFieldLayout(
  settings: InfoboxSettings,
  block: BlockConfig,
  template?: InfoboxTemplate | null,
) {
  const labels = new Map<string, string>();
  for (const [key, label] of Object.entries(settings.labelMap)) {
    labels.set(key.toLowerCase(), label);
  }
  for (const [key, label] of Object.entries(template?.labels ?? {})) {
    labels.set(key.toLowerCase(), label);
  }

  if (block.sections) return { labels, sections: block.sections };
  if (template?.sections.length) return { labels, sections: template.sections };
  return { labels, sections: template?.order.length ? [{ keys: template.order }] : [] };
}

export function buildViewModel(input: ViewModelInput): InfoboxViewModel {
  const { frontmatter, fileBasename, settings, blockConfig, template } = input;

  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return {
      title: fileBasename,
      images: [],
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
    settings.templateKey,
    "tags",
  ]);
  const excluded = new Set(
    [...settings.excludeKeys, ...(blockConfig.exclude ?? [])].map((k) => k.toLowerCase()),
  );

  const { labels, sections: sectionSpecs } = resolveFieldLayout(settings, blockConfig, template);
  const labelFor = (key: string): string => labels.get(key.toLowerCase()) ?? prettifyKey(key);

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

  const unlisted = blockConfig.unlisted ?? template?.unlisted ?? "show";

  const sections: InfoboxSection[] = [];
  for (const spec of sectionSpecs) {
    const fields: InfoboxField[] = [];
    for (const wanted of spec.keys) {
      const field = takeField(wanted);
      if (field) fields.push(field);
    }
    // A section whose keys are all absent from this note renders nothing —
    // section specs may be shared across notes with differing properties.
    if (fields.length > 0) sections.push({ label: spec.label, fields });
  }

  if (pool.size > 0 && unlisted !== "hide") {
    sections.push({ fields: [...pool.values()] });
  }

  return {
    title: asDisplayString(frontmatter[settings.titleKey]) ?? fileBasename,
    subtitle: asDisplayString(frontmatter[settings.subtitleKey]),
    images: asDisplayStringList(blockConfig.image ?? frontmatter[settings.imageKey]),
    caption: blockConfig.caption ?? asDisplayString(frontmatter[settings.captionKey]),
    tags: settings.showTags ? normalizeTags(frontmatter["tags"]) : [],
    sections,
    bare: false,
  };
}
