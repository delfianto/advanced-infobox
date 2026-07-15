import { type App, PluginSettingTab, Setting } from "obsidian";
import {
  type ArrayStyle,
  type BooleanStyle,
  DEFAULT_SETTINGS,
  type Density,
  type LivePreviewPresentation,
  type LpCollapse,
  parseKeyList,
  parseLabelMap,
  type Placement,
  serializeLabelMap,
  type TextAlign,
  type VisualPreset,
} from "src/settings/settings";
import type AdvancedInfoboxPlugin from "src/main";
import { FolderSuggest } from "src/settings/folder-suggest";

export class InfoboxSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: AdvancedInfoboxPlugin,
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── Layout ─────────────────────────────────────────────────

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
      .setName("Live Preview collapse")
      .setDesc(
        "Adds a toggle on the title to fold the box away while writing. Reading view always shows it expanded.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("off", "Off")
          .addOption("expanded", "Collapsible, start expanded")
          .addOption("collapsed", "Collapsible, start collapsed")
          .setValue(this.plugin.settings.lpCollapse)
          .onChange(async (value) => {
            this.plugin.settings.lpCollapse = value as LpCollapse;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Remember collapse state")
      .setDesc("Keep each note's Live Preview collapse toggle across Obsidian restarts.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.lpCollapseRemember).onChange(async (value) => {
          this.plugin.settings.lpCollapseRemember = value;
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
      .setName("Density")
      .setDesc("Vertical padding inside the box.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("compact", "Compact")
          .addOption("normal", "Normal")
          .addOption("comfortable", "Comfortable")
          .setValue(this.plugin.settings.density)
          .onChange(async (value) => {
            this.plugin.settings.density = value as Density;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Visual preset")
      .setDesc(
        "Native follows your Obsidian theme; Wikipedia mimics the classic infobox look (light gray card, subtly rounded corners).",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("native", "Obsidian native")
          .addOption("wikipedia", "Wikipedia classic")
          .setValue(this.plugin.settings.visualPreset)
          .onChange(async (value) => {
            this.plugin.settings.visualPreset = value as VisualPreset;
            await this.plugin.saveSettings();
          }),
      );

    // ── Field display ──────────────────────────────────────────

    new Setting(containerEl).setName("Field display").setHeading();

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
      .setName("Custom labels")
      .setDesc(
        "One `key: Label` per line (e.g. `hp: Hit Points`). Beats the automatic prettifying (eye_color → Eye Color).",
      )
      .addTextArea((text) => {
        text
          .setPlaceholder("hp: Hit Points\narmor_class: AC")
          .setValue(serializeLabelMap(this.plugin.settings.labelMap))
          .onChange(async (value) => {
            this.plugin.settings.labelMap = parseLabelMap(value);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
      });

    new Setting(containerEl)
      .setName("Label alignment")
      .setDesc("Alignment of the property-name column (wiki articles use left).")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("left", "Left")
          .addOption("center", "Center")
          .addOption("right", "Right")
          .setValue(this.plugin.settings.labelAlign)
          .onChange(async (value) => {
            this.plugin.settings.labelAlign = value as TextAlign;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("List display")
      .setDesc("How list properties (e.g. known_for) are rendered.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("list", "Bulleted list")
          .addOption("comma", "Comma-separated")
          .addOption("chips", "Chips")
          .setValue(this.plugin.settings.arrayStyle)
          .onChange(async (value) => {
            this.plugin.settings.arrayStyle = value as ArrayStyle;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Checkbox display")
      .setDesc("How true/false properties are rendered.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("check", "✓ / ✗")
          .addOption("yes-no", "Yes / No")
          .setValue(this.plugin.settings.booleanStyle)
          .onChange(async (value) => {
            this.plugin.settings.booleanStyle = value as BooleanStyle;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Date format")
      .setDesc(
        "Moment format for date properties (e.g. MMMM D, YYYY → March 14, 1879). Leave empty to show dates as written.",
      )
      .addText((text) =>
        text
          .setPlaceholder("MMMM D, YYYY")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value.trim();
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

    // ── Templates ──────────────────────────────────────────────

    new Setting(containerEl).setName("Templates").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Templates are ordinary notes: frontmatter maps property keys to labels " +
        "(key order = display order), headings in the body become sections with the " +
        "listed keys beneath them. A note picks its template with the template " +
        "property (e.g. infobox: person). Run “Create sample infobox templates” " +
        "from the command palette to get starters.",
    });

    new Setting(containerEl)
      .setName("Template folder")
      .setDesc("Vault folder holding template notes; the note name is the template id.")
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder(DEFAULT_SETTINGS.templateFolder)
          .setValue(this.plugin.settings.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.templateFolder = value.trim() || DEFAULT_SETTINGS.templateFolder;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Template property")
      .setDesc("Frontmatter key that names a note's template.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.templateKey)
          .setValue(this.plugin.settings.templateKey)
          .onChange(async (value) => {
            this.plugin.settings.templateKey = value.trim() || DEFAULT_SETTINGS.templateKey;
            await this.plugin.saveSettings();
          }),
      );

    // ── Special keys ───────────────────────────────────────────

    new Setting(containerEl).setName("Special keys").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Which frontmatter properties feed the infobox header. Change these if your vault uses different names (e.g. cover instead of image).",
    });

    const specialKey = (
      name: string,
      key: "titleKey" | "subtitleKey" | "imageKey" | "captionKey",
    ): void => {
      new Setting(containerEl).setName(name).addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS[key])
          .setValue(this.plugin.settings[key])
          .onChange(async (value) => {
            this.plugin.settings[key] = value.trim() || DEFAULT_SETTINGS[key];
            await this.plugin.saveSettings();
          }),
      );
    };
    specialKey("Title property", "titleKey");
    specialKey("Subtitle property", "subtitleKey");
    specialKey("Image property", "imageKey");
    specialKey("Caption property", "captionKey");

    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Per-note overrides: the ```infobox``` block accepts presentation-only options " +
        "(placement, exclude, image, caption, sections, unlisted). Data always comes from " +
        "the note's own frontmatter.",
    });
  }
}
