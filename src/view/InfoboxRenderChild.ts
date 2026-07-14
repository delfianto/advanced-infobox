import { MarkdownRenderChild, TFile } from "obsidian";
import { mount, unmount } from "svelte";
import { parseBlockConfig, type BlockConfig } from "src/model/block-config";
import { buildViewModel } from "src/model/schema";
import Infobox from "src/view/Infobox.svelte";
import { InfoboxModel } from "src/view/infobox-state.svelte";
import { createMarkdownRenderer } from "src/view/markdown";
import type AdvancedInfoboxPlugin from "src/main";

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
  private readonly model = new InfoboxModel();
  private component: Record<string, unknown> | null = null;

  constructor(
    containerEl: HTMLElement,
    private readonly plugin: AdvancedInfoboxPlugin,
    private readonly source: string,
    private readonly sourcePath: string,
  ) {
    super(containerEl);
  }

  onload(): void {
    this.plugin.attach(this);

    const { config, errors } = parseBlockConfig(this.source);
    this.blockConfig = config;
    this.model.errors = errors;
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
        },
      },
    });
  }

  onunload(): void {
    this.plugin.detach(this);
    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }
  }

  /** Recomputes the view model; also called by the plugin on settings changes. */
  refresh(): void {
    const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
    const frontmatter =
      file instanceof TFile
        ? (this.plugin.app.metadataCache.getFileCache(file)?.frontmatter as
            | Record<string, unknown>
            | undefined)
        : undefined;

    this.model.vm = buildViewModel({
      frontmatter,
      fileBasename: file instanceof TFile ? file.basename : this.sourcePath,
      settings: this.plugin.settings,
      blockConfig: this.blockConfig,
    });
    this.model.arrayStyle = this.plugin.settings.arrayStyle;
    this.applyContainerClasses();
  }

  /**
   * Placement is expressed as classes on the processor's container element;
   * styles.css scopes their effect per mode (.markdown-preview-view floats,
   * .markdown-source-view renders the non-wrapping Live Preview card).
   */
  private applyContainerClasses(): void {
    const el = this.containerEl;
    el.removeClasses(["aib-right", "aib-left", "aib-full", "aib-lp-full-width", "aib-lp-aligned"]);
    el.addClasses([
      "aib-container",
      `aib-${this.blockConfig.placement ?? this.plugin.settings.placement}`,
      `aib-lp-${this.plugin.settings.livePreview}`,
    ]);
  }

  private resolveImage(raw: string): string | null {
    let src = raw.trim();
    src = src.replace(/^!?\[\[(.+?)(\|[^\]]*)?\]\]$/, "$1").trim();
    if (/^https?:\/\//i.test(src)) return src;
    const file = this.plugin.app.metadataCache.getFirstLinkpathDest(src, this.sourcePath);
    return file ? this.plugin.app.vault.getResourcePath(file) : null;
  }
}
