import { type App, normalizePath, TFile } from "obsidian";
import { type InfoboxTemplate, parseTemplate, type TemplateSource } from "src/model/template";

/**
 * Resolves template ids to parsed templates. Templates are ordinary notes in
 * the configured folder; the registry parses lazily, caches by id, and is
 * invalidated by main.ts when anything under the folder changes.
 */
export class TemplateRegistry {
  private readonly cache = new Map<string, InfoboxTemplate | null>();

  constructor(
    private readonly app: App,
    private readonly getFolder: () => string,
  ) {}

  folder(): string {
    return normalizePath(this.getFolder().trim() || "Templates/Infobox");
  }

  /** Is this file part of the template folder? Used for cache invalidation. */
  contains(path: string): boolean {
    return path.startsWith(`${this.folder()}/`);
  }

  invalidate(path?: string): void {
    if (path === undefined) {
      this.cache.clear();
      return;
    }
    const basename = path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/u, "");
    this.cache.delete(basename);
  }

  /** All template ids currently on disk (for pickers and suggestions). */
  ids(): string[] {
    const folder = `${this.folder()}/`;
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => f.path.startsWith(folder))
      .map((f) => f.basename)
      .toSorted();
  }

  /** Returns null when the template note does not exist. */
  async resolve(id: string): Promise<InfoboxTemplate | null> {
    if (this.cache.has(id)) return this.cache.get(id) ?? null;

    const file = this.app.vault.getAbstractFileByPath(`${this.folder()}/${id}.md`);
    if (!(file instanceof TFile)) {
      // Not cached: the note may be created a moment later and metadataCache
      // fires no invalidation we could key on before it exists.
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const body = await this.app.vault.cachedRead(file);

    const source: TemplateSource = {
      id,
      frontmatter: cache?.frontmatter as Record<string, unknown> | undefined,
      headings: (cache?.headings ?? []).map((h) => ({
        text: h.heading,
        offset: h.position.start.offset,
      })),
      listItems: (cache?.listItems ?? []).map((item) => ({
        start: item.position.start.offset,
        end: item.position.end.offset,
        parent: item.parent,
      })),
      body,
    };

    const template = parseTemplate(source);
    this.cache.set(id, template);
    return template;
  }
}
