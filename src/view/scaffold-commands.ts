import { Notice, stringifyYaml, TFile } from "obsidian";
import type AdvancedInfoboxPlugin from "src/main";
import { buildBaseConfig } from "src/model/base-config";
import { SAMPLE_TEMPLATES } from "src/model/sample-templates";

/**
 * Registers the two one-off vault-scaffolding commands — "Create sample
 * infobox templates" and "Create base from folder" — grouped in their own
 * module so main.ts's own import surface (capped by max-dependencies) stays
 * small.
 */
export function registerScaffoldCommands(plugin: AdvancedInfoboxPlugin): void {
  plugin.addCommand({
    id: "create-sample-templates",
    name: "Create sample infobox templates",
    callback: () => void createSampleTemplates(plugin),
  });

  plugin.addCommand({
    id: "create-base-from-folder",
    name: "Create base from folder",
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      if (!file) return false;
      if (!checking) void createBaseFromFolder(plugin, file);
      return true;
    },
  });
}

async function createSampleTemplates(plugin: AdvancedInfoboxPlugin): Promise<void> {
  const folder = plugin.templates.folder();
  // Create the folder chain level by level; createFolder rejects existing.
  const parts = folder.split("/");
  for (let i = 1; i <= parts.length; i++) {
    const path = parts.slice(0, i).join("/");
    if (!plugin.app.vault.getAbstractFileByPath(path)) {
      await plugin.app.vault.createFolder(path).catch(() => {});
    }
  }

  let created = 0;
  for (const [id, content] of Object.entries(SAMPLE_TEMPLATES)) {
    const path = `${folder}/${id}.md`;
    if (plugin.app.vault.getAbstractFileByPath(path)) continue;
    await plugin.app.vault.create(path, content);
    created++;
  }
  new Notice(
    created > 0
      ? `Created ${created} sample template${created === 1 ? "" : "s"} in ${folder}/.`
      : `All sample templates already exist in ${folder}/.`,
  );
}

/**
 * Generates an Obsidian Base (.base) from the active note's folder: detects
 * the dominant template among the folder's notes, projects it onto a table
 * view (traditional list) and a cards view, and writes the file. Presentation
 * only — it reads frontmatter, never writes to the notes. See §8.1.
 */
async function createBaseFromFolder(plugin: AdvancedInfoboxPlugin, active: TFile): Promise<void> {
  const { parent } = active;
  const folder = parent && !parent.isRoot() ? parent.path : "";
  const prefix = folder ? `${folder}/` : "";
  const notes = plugin.app.vault
    .getMarkdownFiles()
    .filter((f) => (folder ? f.path.startsWith(prefix) : true));

  const special = new Set(
    [
      plugin.settings.titleKey,
      plugin.settings.subtitleKey,
      plugin.settings.imageKey,
      plugin.settings.captionKey,
      plugin.settings.templateKey,
      "tags",
      ...plugin.settings.excludeKeys,
    ].map((k) => k.toLowerCase()),
  );

  // Tally the template each note names; pick the most common as the shape.
  const tally = new Map<string, number>();
  const seen = new Set<string>();
  let hasImages = false;
  for (const note of notes) {
    const fm = plugin.app.metadataCache.getFileCache(note)?.frontmatter as
      | Record<string, unknown>
      | undefined;
    if (!fm) continue;
    const id = fm[plugin.settings.templateKey];
    if (typeof id === "string" && id.trim()) {
      tally.set(id.trim(), (tally.get(id.trim()) ?? 0) + 1);
    }
    const image = fm[plugin.settings.imageKey];
    const imageList = Array.isArray(image) ? image : [image];
    if (imageList.some((v) => typeof v === "string" && v.trim() !== "")) hasImages = true;
    for (const key of Object.keys(fm)) if (!special.has(key.toLowerCase())) seen.add(key);
  }
  const templateId = [...tally].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const template = templateId ? await plugin.templates.resolve(templateId) : null;

  const config = buildBaseConfig({
    folder,
    template,
    templateKey: plugin.settings.templateKey,
    templateId,
    titleKey: plugin.settings.titleKey,
    imageKey: plugin.settings.imageKey,
    hasImages,
    fallbackKeys: [...seen],
  });

  const baseName = folder ? folder.slice(folder.lastIndexOf("/") + 1) : "Infobox";
  const path = `${prefix}${baseName}.base`;
  const existing = plugin.app.vault.getAbstractFileByPath(path);
  if (existing) {
    new Notice(`A base already exists at ${path}. Opening it.`);
    if (existing instanceof TFile) await plugin.app.workspace.getLeaf(false).openFile(existing);
    return;
  }

  const created = await plugin.app.vault.create(path, stringifyYaml(config));
  await plugin.app.workspace.getLeaf(false).openFile(created);
  new Notice(
    templateId
      ? `Created ${path} from template “${templateId}”.`
      : `Created ${path} from ${notes.length} note${notes.length === 1 ? "" : "s"}.`,
  );
}
