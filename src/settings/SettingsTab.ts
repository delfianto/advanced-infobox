import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
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

/** Leading numeric value of a CSS length string, or NaN (e.g. "22em" → 22). */
function leadingNumber(length: string): number {
  return Number(/^\d*\.?\d+/u.exec(length.trim())?.[0] ?? "");
}

/** The numeric em value of a CSS length string, falling back when unparseable. */
function emValue(length: string, fallback: string): number {
  const parsed = leadingNumber(length);
  return parsed > 0 ? parsed : leadingNumber(fallback);
}

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
    containerEl.addClass("aib-settings");

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
          .addOption("aligned", "Follow placement")
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
          .addOption("off", "Disabled")
          .addOption("collapsed", "Start collapsed")
          .addOption("expanded", "Start expanded")
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

    const widthSetting = new Setting(containerEl)
      .setName("Width")
      .setDesc("Infobox width, in em. Capped on narrow panes.");
    const widthValue = widthSetting.controlEl.createSpan({
      cls: "aib-slider-value",
      text: this.plugin.settings.width,
    });
    widthSetting.addSlider((slider) =>
      slider
        .setLimits(14, 40, 1)
        .setValue(emValue(this.plugin.settings.width, DEFAULT_SETTINGS.width))
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.width = `${value}em`;
          widthValue.setText(this.plugin.settings.width);
          await this.plugin.saveSettings();
        }),
    );

    const fontSetting = new Setting(containerEl)
      .setName("Font size")
      .setDesc("Infobox text size relative to the note, in em.");
    const fontValue = fontSetting.controlEl.createSpan({
      cls: "aib-slider-value",
      text: this.plugin.settings.fontSize,
    });
    fontSetting.addSlider((slider) =>
      slider
        .setLimits(0.7, 1.4, 0.05)
        .setValue(emValue(this.plugin.settings.fontSize, DEFAULT_SETTINGS.fontSize))
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.fontSize = `${Number(value.toFixed(2))}em`;
          fontValue.setText(this.plugin.settings.fontSize);
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
      .setDesc("Frontmatter keys never shown as fields — one per line (commas also work).")
      .addTextArea((text) => {
        text
          .setPlaceholder(DEFAULT_SETTINGS.excludeKeys.join("\n"))
          .setValue(this.plugin.settings.excludeKeys.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.excludeKeys = parseKeyList(value);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
      });

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

    // ── Editing ────────────────────────────────────────────────

    new Setting(containerEl).setName("Editing").setHeading();

    new Setting(containerEl)
      .setName("Edit properties in infobox")
      .setDesc(
        "Make boolean, number, text, date, and list fields editable in the box: click a checkbox " +
          "to flip it, type into a field (Enter or clicking away commits, Escape cancels), or add " +
          "and remove list items. Edits are written straight to the note's frontmatter. Datetime " +
          "and nested/object values stay read-only.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.editInBox).onChange(async (value) => {
          this.plugin.settings.editInBox = value;
          await this.plugin.saveSettings();
        }),
      );

    // ── Bases ──────────────────────────────────────────────────

    new Setting(containerEl).setName("Bases").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Run “Create base from folder” from the command palette to generate an Obsidian " +
        "Base (a table view and a cards view) from the notes in the active note's folder, " +
        "using their detected template.",
    });

    new Setting(containerEl)
      .setName("Infobox on hover in Bases")
      .setDesc(
        "Inside an Obsidian Base, show a note's infobox in a popover when you hover a link " +
          "to it — e.g. the file-name column of a table view. Best-effort: it reads the " +
          "Base's rendered markup, so it does nothing if Bases isn't available.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.basesHoverPreview).onChange(async (value) => {
          this.plugin.settings.basesHoverPreview = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Infobox view in Bases")
      .setDesc(
        "Adds an “Infobox” view type to Bases that renders each entry as its full infobox " +
          "(a gallery of cards) — pick it from a Base's view menu. Needs Obsidian with Bases; " +
          "reload to fully apply a change.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.basesInfoboxView).onChange(async (value) => {
          this.plugin.settings.basesInfoboxView = value;
          await this.plugin.saveSettings();
          if (value) this.plugin.registerInfoboxBasesView();
          new Notice(
            value
              ? "Infobox view enabled — reopen a Base and pick it from the view menu."
              : "Reload Obsidian to remove the Infobox view.",
          );
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

    // ── Reset ──────────────────────────────────────────────────

    new Setting(containerEl)
      .setName("Reset settings")
      .setDesc("Restore every Advanced Infobox setting to its default.")
      .addButton((button) => {
        let armed = false;
        button
          .setButtonText("Reset to defaults")
          .setWarning()
          .onClick(async () => {
            if (!armed) {
              armed = true;
              button.setButtonText("Click again to confirm");
              setTimeout(() => {
                armed = false;
                button.setButtonText("Reset to defaults");
              }, 3000);
              return;
            }
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }
}
