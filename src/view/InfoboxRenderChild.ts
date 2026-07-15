import { type BlockConfig, parseBlockConfig } from "src/model/block-config";
import { MarkdownRenderChild, moment, Notice, TFile } from "obsidian";
import { mount, unmount } from "svelte";
import type AdvancedInfoboxPlugin from "src/main";
import { buildViewModel } from "src/model/schema";
import { createMarkdownRenderer } from "src/view/markdown";
import Infobox from "src/view/Infobox.svelte";
import { InfoboxModel } from "src/view/infobox-state.svelte";

/**
 * One rendered infobox widget. Created by the code block processor for both
 * Reading view and Live Preview; Obsidian manages its lifecycle through
 * MarkdownPostProcessorContext.addChild.
 *
 * Data flows one way: metadataCache frontmatter → buildViewModel → reactive
 * InfoboxModel → Svelte. Editing a property (including via the Properties UI)
 * fires `metadataCache.changed` and the box updates in place.
 */
export class InfoboxRenderChild extends MarkdownRenderChild {
  private blockConfig: BlockConfig = {};
  private blockErrors: string[] = [];
  private readonly model = new InfoboxModel();
  private component: Record<string, unknown> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Refresh is async (template resolution reads files); last one wins. */
  private refreshSeq = 0;
  /** >0 while a field editor is focused; refreshes defer until it settles. */
  private editDepth = 0;
  private pendingRefresh = false;

  constructor(
    containerEl: HTMLElement,
    private readonly plugin: AdvancedInfoboxPlugin,
    private readonly source: string,
    private readonly sourcePath: string,
  ) {
    super(containerEl);
  }

  override onload(): void {
    this.plugin.attach(this);

    const { config, errors } = parseBlockConfig(this.source);
    this.blockConfig = config;
    this.blockErrors = errors;
    this.model.errors = errors;
    this.model.collapsed = this.plugin.initialCollapsed(this.sourcePath);
    this.refresh();

    this.registerEvent(
      this.plugin.app.metadataCache.on("changed", (file) => {
        if (file.path === this.sourcePath) this.refresh();
      }),
    );

    this.component = mount(Infobox, {
      target: this.containerEl,
      props: {
        model: this.model,
        ctx: {
          renderMarkdown: createMarkdownRenderer(this.plugin.app, this.sourcePath, this),
          resolveImage: (raw: string) => this.resolveImage(raw),
          formatDate: (iso: string) => this.formatDate(iso),
          persistCollapse: (collapsed: boolean) =>
            this.plugin.rememberCollapsed(this.sourcePath, collapsed),
          commitField: (key: string, value: string | number | boolean) =>
            void this.commitField(key, value),
          beginEdit: () => this.beginEdit(),
          endEdit: () => this.endEdit(),
        },
      },
    });

    this.observePaneWidth();
  }

  override onunload(): void {
    this.plugin.detach(this);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }
  }

  /** Recomputes the view model; also called by the plugin on settings changes. */
  refresh(): void {
    // While a field editor is focused, defer: replacing the view model would
    // tear down the live <input> mid-edit — and our own write re-enters here
    // via metadataCache "changed". Reconcile once editing settles (endEdit).
    if (this.editDepth > 0) {
      this.pendingRefresh = true;
      return;
    }
    void this.refreshAsync();
  }

  private async refreshAsync(): Promise<void> {
    const seq = ++this.refreshSeq;
    const { settings } = this.plugin;

    const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
    const frontmatter =
      file instanceof TFile
        ? (this.plugin.app.metadataCache.getFileCache(file)?.frontmatter as
            | Record<string, unknown>
            | undefined)
        : undefined;

    // Template: per-note block option beats the flat frontmatter property.
    const warnings: string[] = [];
    const templateId =
      this.blockConfig.template ??
      (typeof frontmatter?.[settings.templateKey] === "string"
        ? (frontmatter[settings.templateKey] as string).trim()
        : undefined);
    let template = null;
    if (templateId) {
      template = await this.plugin.templates.resolve(templateId);
      if (!template) {
        warnings.push(
          `Template \`${templateId}\` not found in ${this.plugin.templates.folder()}/ — rendering without it.`,
        );
      }
    }
    // Superseded by a newer refresh: drop this result.
    if (seq !== this.refreshSeq) return;

    this.model.vm = buildViewModel({
      frontmatter,
      fileBasename: file instanceof TFile ? file.basename : this.sourcePath,
      settings,
      blockConfig: this.blockConfig,
      template,
    });
    this.model.errors = [...this.blockErrors, ...warnings];
    this.model.arrayStyle = settings.arrayStyle;
    this.model.booleanStyle = settings.booleanStyle;
    this.model.editEnabled = settings.editInBox;
    this.model.collapsible = settings.lpCollapse !== "off";
    this.applyContainerClasses();
  }

  private beginEdit(): void {
    this.editDepth++;
  }

  private endEdit(): void {
    this.editDepth = Math.max(0, this.editDepth - 1);
    if (this.editDepth === 0 && this.pendingRefresh) {
      this.pendingRefresh = false;
      this.refresh();
    }
  }

  /** Writes a scalar edit back to frontmatter; never touches the note body. */
  private async commitField(key: string, value: string | number | boolean): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
    if (!(file instanceof TFile)) return;
    try {
      await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[key] = value;
      });
    } catch (error) {
      new Notice(`Advanced Infobox: could not save "${key}".`);
      console.error("[advanced-infobox] processFrontMatter failed", error);
    }
  }

  private formatDate(iso: string): string {
    const format = this.plugin.settings.dateFormat.trim();
    if (format === "") return iso;
    // moment.utc: keeps date-only values from shifting a day in western
    // timezones, and (unlike the bare call) is callable per obsidian.d.ts.
    const parsed = moment.utc(iso, moment.ISO_8601, true);
    return parsed.isValid() ? parsed.format(format) : iso;
  }

  /**
   * Media queries see the window, not the pane — wrong for split layouts.
   * Watch the enclosing pane instead and collapse the float when prose
   * would have no room next to it.
   */
  private observePaneWidth(): void {
    const pane = this.containerEl.closest(
      ".markdown-reading-view, .markdown-preview-view, .markdown-source-view",
    );
    if (!(pane instanceof HTMLElement) || typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries.at(-1)?.contentRect.width ?? 0;
      this.containerEl.classList.toggle("aib-narrow", width > 0 && width < 500);
    });
    this.resizeObserver.observe(pane);
  }

  /**
   * Placement is expressed as classes on the processor's container element;
   * styles.css scopes their effect per mode (.markdown-preview-view floats,
   * .markdown-source-view renders the non-wrapping Live Preview card).
   */
  private applyContainerClasses(): void {
    const el = this.containerEl;
    const { settings } = this.plugin;
    el.removeClasses([
      "aib-right",
      "aib-left",
      "aib-full",
      "aib-lp-full-width",
      "aib-lp-aligned",
      "aib-density-compact",
      "aib-density-comfortable",
      "aib-preset-wikipedia",
    ]);
    el.addClasses([
      "aib-container",
      `aib-${this.blockConfig.placement ?? settings.placement}`,
      `aib-lp-${settings.livePreview}`,
    ]);
    if (settings.density !== "normal") el.addClass(`aib-density-${settings.density}`);
    if (settings.visualPreset === "wikipedia") el.addClass("aib-preset-wikipedia");
  }

  private resolveImage(raw: string): string | null {
    let src = raw.trim();
    src = src.replace(/^!?\[\[(?<target>.+?)(?:\|[^\]]*)?\]\]$/u, "$<target>").trim();
    if (/^https?:\/\//iu.test(src)) return src;
    const file = this.plugin.app.metadataCache.getFirstLinkpathDest(src, this.sourcePath);
    return file ? this.plugin.app.vault.getResourcePath(file) : null;
  }
}
