import { Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, sanitizeCssLength, type InfoboxSettings } from "src/settings/settings";
import { InfoboxSettingTab } from "src/settings/SettingsTab";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";
import "src/styles.css";

export default class AdvancedInfoboxPlugin extends Plugin {
  settings: InfoboxSettings = { ...DEFAULT_SETTINGS };

  private readonly children = new Set<InfoboxRenderChild>();
  private styleEl: HTMLStyleElement | null = null;
  /**
   * Session-only collapse state per note path. CM6 remounts widgets freely
   * while editing; without this, a box the user expanded would snap back to
   * its default on every remount.
   */
  private readonly lpCollapseState = new Map<string, boolean>();

  async onload(): Promise<void> {
    // Proves which build Obsidian actually loaded; the toast is dev-only.
    if (__DEV_BUILD__) new Notice(`Advanced Infobox build ${__BUILD_TIME__}`);
    console.log(`[advanced-infobox] build ${__BUILD_TIME__}`);
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

  initialCollapsed(sourcePath: string): boolean {
    if (this.settings.lpCollapse === "off") return false;
    return this.lpCollapseState.get(sourcePath) ?? this.settings.lpCollapse === "collapsed";
  }

  rememberCollapsed(sourcePath: string, collapsed: boolean): void {
    this.lpCollapseState.set(sourcePath, collapsed);
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
