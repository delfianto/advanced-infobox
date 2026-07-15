import { BasesView, type QueryController } from "obsidian";
import type AdvancedInfoboxPlugin from "src/main";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";

/** The Bases view-type id; also what a `.base` file names in `views[].type`. */
export const INFOBOX_BASES_VIEW = "advanced-infobox";

/**
 * A first-class Bases view (registered via `plugin.registerBasesView`, Obsidian
 * 1.10+) that renders each entry as its full infobox — a gallery of infobox
 * cards. This is how you preview infoboxes *as* a Base view; unlike the native
 * cards view (which exposes no file link), here we hold the `BasesEntry` objects
 * and render each note's box directly, reusing the ordinary pipeline via a
 * standalone {@link InfoboxRenderChild} per entry (so they match the in-note box
 * and live-update). Opt-in — see the `basesInfoboxView` setting.
 */
export class InfoboxBasesView extends BasesView {
  readonly type = INFOBOX_BASES_VIEW;
  private readonly grid: HTMLElement;
  private cards: InfoboxRenderChild[] = [];

  constructor(
    controller: QueryController,
    containerEl: HTMLElement,
    private readonly plugin: AdvancedInfoboxPlugin,
  ) {
    super(controller);
    this.grid = containerEl.createDiv({ cls: "aib-bases-view" });
  }

  // Called by Bases whenever the query result changes; rebuild the gallery. The
  // result is replaced (not mutated) each time, so a full rerender is correct.
  onDataUpdated(): void {
    this.clear();
    for (const entry of this.data?.data ?? []) {
      const cell = this.grid.createDiv({ cls: "aib-bases-cell" });
      // Empty block source → render the note's frontmatter-driven infobox.
      const card = new InfoboxRenderChild(cell, this.plugin, "", entry.file.path);
      card.load();
      this.cards.push(card);
    }
  }

  override onunload(): void {
    this.clear();
  }

  private clear(): void {
    for (const card of this.cards) card.unload();
    this.cards = [];
    this.grid.empty();
  }
}
