import { PluginSettingTab, Setting, type App } from "obsidian";
import {
  DEFAULT_SETTINGS,
  parseKeyList,
  type ArrayStyle,
  type LivePreviewPresentation,
  type Placement,
} from "src/settings/settings";
import type AdvancedInfoboxPlugin from "src/main";

export class InfoboxSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: AdvancedInfoboxPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Placement")
      .setDesc(
        "Where the infobox sits in Reading view. Body text wraps around a floated box, like a wiki article.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("right", "Float right")
          .addOption("left", "Float left")
          .addOption("full", "Full width")
          .setValue(this.plugin.settings.placement)
          .onChange(async (value) => {
            this.plugin.settings.placement = value as Placement;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Live Preview presentation")
      .setDesc(
        "Editor lines cannot wrap around a floated widget, so Live Preview shows a non-wrapping card instead. Reading view is unaffected.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("full-width", "Full width")
          .addOption("aligned", "Aligned to placement side")
          .setValue(this.plugin.settings.livePreview)
          .onChange(async (value) => {
            this.plugin.settings.livePreview = value as LivePreviewPresentation;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Width")
      .setDesc("CSS length for the infobox width (e.g. 22em, 320px). Capped on narrow panes.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.width)
          .setValue(this.plugin.settings.width)
          .onChange(async (value) => {
            this.plugin.settings.width = value.trim() || DEFAULT_SETTINGS.width;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Font size")
      .setDesc("CSS length for the infobox text (e.g. 0.9em, 13px).")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.fontSize)
          .setValue(this.plugin.settings.fontSize)
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value.trim() || DEFAULT_SETTINGS.fontSize;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Excluded properties")
      .setDesc("Comma-separated frontmatter keys that are never shown as fields.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.excludeKeys.join(", "))
          .setValue(this.plugin.settings.excludeKeys.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludeKeys = parseKeyList(value);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("List display")
      .setDesc("How list properties (e.g. known_for) are rendered.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("comma", "Comma-separated")
          .addOption("chips", "Chips")
          .setValue(this.plugin.settings.arrayStyle)
          .onChange(async (value) => {
            this.plugin.settings.arrayStyle = value as ArrayStyle;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Show tags")
      .setDesc("Render the note's tags at the bottom of the infobox.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showTags).onChange(async (value) => {
          this.plugin.settings.showTags = value;
          await this.plugin.saveSettings();
        }),
      );

    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Per-note overrides: the ```infobox``` block accepts presentation-only options " +
        "(placement, exclude, image, caption, sections, unlisted). Data always comes from " +
        "the note's own frontmatter.",
    });
  }
}
