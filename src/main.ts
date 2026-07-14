import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, sanitizeCssLength, type InfoboxSettings } from "src/settings/settings";
import { InfoboxSettingTab } from "src/settings/SettingsTab";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";
import "src/styles.css";

export default class AdvancedInfoboxPlugin extends Plugin {
  settings: InfoboxSettings = { ...DEFAULT_SETTINGS };

  private readonly children = new Set<InfoboxRenderChild>();
  private styleEl: HTMLStyleElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("infobox", (source, el, ctx) => {
      ctx.addChild(new InfoboxRenderChild(el, this, source, ctx.sourcePath));
    });

    this.addSettingTab(new InfoboxSettingTab(this.app, this));
    this.applySettingsCss();
  }

  onunload(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  attach(child: InfoboxRenderChild): void {
    this.children.add(child);
  }

  detach(child: InfoboxRenderChild): void {
    this.children.delete(child);
  }

  async loadSettings(): Promise<void> {
    const stored = ((await this.loadData()) ?? {}) as Partial<InfoboxSettings>;
    this.settings = { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.applySettingsCss();
    for (const child of this.children) child.refresh();
  }

  /**
   * Settings land as CSS custom properties on body, which styles.css reads
   * with `var(--aib-*, fallback)`. Themes, snippets, and Style Settings can
   * set the same variables at more specific scopes to win over these.
   */
  private applySettingsCss(): void {
    if (!this.styleEl) {
      this.styleEl = document.head.createEl("style", {
        attr: { id: "aib-settings-css" },
      });
    }
    const width = sanitizeCssLength(this.settings.width, DEFAULT_SETTINGS.width);
    const fontSize = sanitizeCssLength(this.settings.fontSize, DEFAULT_SETTINGS.fontSize);
    this.styleEl.textContent = `body { --aib-width: ${width}; --aib-font-size: ${fontSize}; }`;
  }
}
