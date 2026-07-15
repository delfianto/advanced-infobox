import "src/styles.css";
import { debounce, type Editor, normalizePath, Notice, Plugin, type TFile } from "obsidian";
import { DEFAULT_SETTINGS, type InfoboxSettings, sanitizeCssLength } from "src/settings/settings";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";
import { InfoboxSettingTab } from "src/settings/SettingsTab";
import { SAMPLE_TEMPLATES } from "src/model/sample-templates";
import { TemplatePickerModal } from "src/view/TemplatePickerModal";
import { TemplateRegistry } from "src/model/template-registry";

// vite `define` replacement has proven unreliable on incremental watch
// rebuilds (rolldown alpha drops it for re-transformed modules), so read the
// injected constants defensively — a missing define must never crash onload.
const BUILD_TIME = typeof __BUILD_TIME__ === "undefined" ? "unknown" : __BUILD_TIME__;
const DEV_BUILD = typeof __DEV_BUILD__ === "undefined" ? false : __DEV_BUILD__;

/** Upper bound on remembered collapse entries (oldest evicted first). */
const COLLAPSE_CAP = 300;

/** data.json shape: settings plus optionally-persisted collapse state. */
type StoredData = Partial<InfoboxSettings> & { lpCollapseState?: Record<string, boolean> };

export default class AdvancedInfoboxPlugin extends Plugin {
  override settings: InfoboxSettings = { ...DEFAULT_SETTINGS };
  readonly templates = new TemplateRegistry(this.app, () => this.settings.templateFolder);

  private readonly children = new Set<InfoboxRenderChild>();
  private styleEl: HTMLStyleElement | null = null;
  /**
   * Session-only collapse state per note path. CM6 remounts widgets freely
   * while editing; without this, a box the user expanded would snap back to
   * its default on every remount.
   */
  private readonly lpCollapseState = new Map<string, boolean>();
  /** Collapse toggles arrive per click; batch the disk writes. */
  private readonly persistCollapseSoon = debounce(() => void this.persistAll(), 1000, true);
  /** Template edits refresh every open infobox; collapse bursts. */
  private readonly refreshAllSoon = debounce(() => this.refreshAll(), 150, true);

  override async onload(): Promise<void> {
    // Proves which build Obsidian actually loaded; the toast is dev-only.
    if (DEV_BUILD) new Notice(`Advanced Infobox build ${BUILD_TIME}`);
    console.log(`[advanced-infobox] build ${BUILD_TIME}`);
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("infobox", (source, el, ctx) => {
      ctx.addChild(new InfoboxRenderChild(el, this, source, ctx.sourcePath));
    });

    this.addCommand({
      id: "insert-infobox",
      name: "Insert infobox",
      editorCallback: (editor) => {
        editor.replaceSelection("```infobox\n```\n");
      },
    });

    this.addCommand({
      id: "insert-infobox-with-template",
      name: "Insert infobox with template",
      editorCallback: (editor) => this.insertWithTemplate(editor),
    });

    this.addCommand({
      id: "insert-infobox-skeleton",
      name: "Insert infobox with sections skeleton",
      editorCallback: (editor) => this.insertSkeleton(editor),
    });

    this.addCommand({
      id: "create-sample-templates",
      name: "Create sample infobox templates",
      callback: () => void this.createSampleTemplates(),
    });

    this.addCommand({
      id: "add-template-properties",
      name: "Add missing template properties to note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.addTemplateProperties(file);
        return true;
      },
    });

    // Editing a template note live-updates every open infobox using it.
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.templates.contains(file.path)) {
          this.templates.invalidate(file.path);
          this.refreshAllSoon();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        // The template folder itself moved: follow it instead of degrading.
        if (normalizePath(oldPath) === this.templates.folder()) {
          this.settings.templateFolder = file.path;
          void this.saveSettings();
          return;
        }
        if (this.templates.contains(file.path) || this.templates.contains(oldPath)) {
          this.templates.invalidate();
          this.refreshAllSoon();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.templates.contains(file.path)) {
          this.templates.invalidate();
          this.refreshAllSoon();
        }
      }),
    );

    this.addSettingTab(new InfoboxSettingTab(this.app, this));
    this.applySettingsCss();
  }

  override onunload(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  attach(child: InfoboxRenderChild): void {
    this.children.add(child);
  }

  initialCollapsed(sourcePath: string): boolean {
    if (this.settings.lpCollapse === "off") return false;
    return this.lpCollapseState.get(sourcePath) ?? this.settings.lpCollapse === "collapsed";
  }

  rememberCollapsed(sourcePath: string, collapsed: boolean): void {
    this.lpCollapseState.delete(sourcePath);
    this.lpCollapseState.set(sourcePath, collapsed);
    while (this.lpCollapseState.size > COLLAPSE_CAP) {
      const oldest = this.lpCollapseState.keys().next().value;
      if (oldest === undefined) break;
      this.lpCollapseState.delete(oldest);
    }
    if (this.settings.lpCollapseRemember) this.persistCollapseSoon();
  }

  detach(child: InfoboxRenderChild): void {
    this.children.delete(child);
  }

  async loadSettings(): Promise<void> {
    const stored = ((await this.loadData()) ?? {}) as StoredData;
    const { lpCollapseState, ...rest } = stored;
    this.settings = { ...DEFAULT_SETTINGS, ...rest };
    if (this.settings.lpCollapseRemember && lpCollapseState) {
      for (const [path, collapsed] of Object.entries(lpCollapseState)) {
        this.lpCollapseState.set(path, collapsed);
      }
    }
  }

  private async persistAll(): Promise<void> {
    const data: StoredData = { ...this.settings };
    if (this.settings.lpCollapseRemember && this.lpCollapseState.size > 0) {
      data.lpCollapseState = Object.fromEntries(this.lpCollapseState);
    }
    await this.saveData(data);
  }

  async saveSettings(): Promise<void> {
    await this.persistAll();
    this.applySettingsCss();
    this.templates.invalidate();
    this.refreshAll();
  }

  refreshAll(): void {
    for (const child of this.children) child.refresh();
  }

  private insertWithTemplate(editor: Editor): void {
    const ids = this.templates.ids();
    if (ids.length === 0) {
      new Notice(
        `No templates found in ${this.templates.folder()}/. ` +
          `Run "Create sample infobox templates" to get started.`,
      );
      return;
    }
    new TemplatePickerModal(this.app, ids, (id) => {
      editor.replaceSelection(`\`\`\`infobox\ntemplate: ${id}\n\`\`\`\n`);
    }).open();
  }

  /** Seeds a sections scaffold from the active note's own properties. */
  private insertSkeleton(editor: Editor): void {
    const file = this.app.workspace.getActiveFile();
    const frontmatter = file
      ? (this.app.metadataCache.getFileCache(file)?.frontmatter as
          | Record<string, unknown>
          | undefined)
      : undefined;
    const hidden = new Set(
      [
        this.settings.titleKey,
        this.settings.subtitleKey,
        this.settings.imageKey,
        this.settings.captionKey,
        this.settings.templateKey,
        "tags",
        ...this.settings.excludeKeys,
      ].map((k) => k.toLowerCase()),
    );
    const keys = Object.keys(frontmatter ?? {}).filter((k) => !hidden.has(k.toLowerCase()));
    const body = keys.length > 0 ? `sections:\n  Info: [${keys.join(", ")}]\n` : "";
    editor.replaceSelection(`\`\`\`infobox\n${body}\`\`\`\n`);
  }

  private async createSampleTemplates(): Promise<void> {
    const folder = this.templates.folder();
    // Create the folder chain level by level; createFolder rejects existing.
    const parts = folder.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/");
      if (!this.app.vault.getAbstractFileByPath(path)) {
        await this.app.vault.createFolder(path).catch(() => {});
      }
    }

    let created = 0;
    for (const [id, content] of Object.entries(SAMPLE_TEMPLATES)) {
      const path = `${folder}/${id}.md`;
      if (this.app.vault.getAbstractFileByPath(path)) continue;
      await this.app.vault.create(path, content);
      created++;
    }
    new Notice(
      created > 0
        ? `Created ${created} sample template${created === 1 ? "" : "s"} in ${folder}/.`
        : `All sample templates already exist in ${folder}/.`,
    );
  }

  /**
   * Scaffolds the template's keys into the active note's frontmatter via
   * processFrontMatter (never touches the body). Notes without a template
   * property get a picker, and the chosen id is written too.
   */
  private async addTemplateProperties(file: TFile): Promise<void> {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter as
      | Record<string, unknown>
      | undefined;
    const existing = fm?.[this.settings.templateKey];
    const id = typeof existing === "string" && existing.trim() !== "" ? existing.trim() : null;

    if (id) {
      await this.scaffoldProperties(file, id, false);
      return;
    }
    const ids = this.templates.ids();
    if (ids.length === 0) {
      new Notice(
        `No templates found in ${this.templates.folder()}/. ` +
          `Run "Create sample infobox templates" to get started.`,
      );
      return;
    }
    new TemplatePickerModal(this.app, ids, (picked) => {
      void this.scaffoldProperties(file, picked, true);
    }).open();
  }

  private async scaffoldProperties(file: TFile, id: string, setKey: boolean): Promise<void> {
    const template = await this.templates.resolve(id);
    if (!template) {
      new Notice(`Template \`${id}\` not found in ${this.templates.folder()}/.`);
      return;
    }
    const keys = [...new Set([...template.sections.flatMap((s) => s.keys), ...template.order])];
    let added = 0;
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (setKey) frontmatter[this.settings.templateKey] = id;
      const present = new Set(Object.keys(frontmatter).map((k) => k.toLowerCase()));
      for (const key of keys) {
        if (present.has(key.toLowerCase())) continue;
        frontmatter[key] = "";
        added++;
      }
    });
    new Notice(
      added > 0
        ? `Added ${added} propert${added === 1 ? "y" : "ies"} from template \`${id}\`.`
        : `Note already has every property of template \`${id}\`.`,
    );
  }

  /**
   * Settings land as CSS custom properties on body, which styles.css reads
   * with `var(--aib-*, fallback)`. Only values the user actually changed are
   * emitted — a setting left at its default stays out of the cascade so the
   * same variable remains freely drivable from Style Settings or snippets.
   */
  private applySettingsCss(): void {
    if (!this.styleEl) {
      this.styleEl = document.head.createEl("style", {
        attr: { id: "aib-settings-css" },
      });
    }
    const decls: string[] = [];
    if (this.settings.width !== DEFAULT_SETTINGS.width) {
      decls.push(`--aib-width: ${sanitizeCssLength(this.settings.width, DEFAULT_SETTINGS.width)}`);
    }
    if (this.settings.fontSize !== DEFAULT_SETTINGS.fontSize) {
      decls.push(
        `--aib-font-size: ${sanitizeCssLength(this.settings.fontSize, DEFAULT_SETTINGS.fontSize)}`,
      );
    }
    // labelAlign is a closed union from a dropdown; no sanitizing needed.
    if (this.settings.labelAlign !== DEFAULT_SETTINGS.labelAlign) {
      decls.push(`--aib-label-align: ${this.settings.labelAlign}`);
    }
    this.styleEl.textContent = decls.length > 0 ? `body { ${decls.join("; ")}; }` : "";
  }
}
