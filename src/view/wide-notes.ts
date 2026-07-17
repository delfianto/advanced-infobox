import type AdvancedInfoboxPlugin from "src/main";

const WIDE_CLASS = "aib-wide";

/**
 * Widens a note's Live Preview / Reading view content column past Obsidian's
 * global "Readable line length" when the note contains an infobox or an
 * embedded Base — both read better full-width than clamped to prose width.
 * `InfoboxRenderChild` also calls {@link recompute} directly right after each
 * render so a freshly-added or -removed infobox takes effect immediately.
 *
 * An embedded Base renders asynchronously — `.bases-view` may not exist yet
 * when a note first opens — so a single `MutationObserver` on the whole
 * workspace (not a specific leaf) catches it whenever it actually finishes.
 * A per-leaf observer (rebound on "active-leaf-change" via the deprecated,
 * frequently-stale `workspace.activeLeaf`) used to miss this intermittently:
 * whichever leaf it ended up bound to could already be stale by the time a
 * slow Base embed finished rendering, leaving the note narrow until some
 * unrelated event forced a recheck that happened to land after the fact.
 * `workspace.containerEl` never gets swapped out, so there's no leaf to lose
 * track of, and background split panes are covered the same way as the
 * active one.
 */
export class WideNoteManager {
  private observer: MutationObserver | null = null;

  constructor(private readonly plugin: AdvancedInfoboxPlugin) {}

  register(): void {
    this.observer = new MutationObserver(() => this.recomputeAll());
    this.observer.observe(this.plugin.app.workspace.containerEl, {
      childList: true,
      subtree: true,
    });
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => this.recomputeAll()),
    );
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => this.recomputeAll()),
    );
    this.plugin.registerEvent(this.plugin.app.workspace.on("file-open", () => this.recomputeAll()));
    this.recomputeAll();
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    for (const el of document.querySelectorAll(`.${WIDE_CLASS}`)) {
      el.classList.remove(WIDE_CLASS);
    }
  }

  /** Called by InfoboxRenderChild after every render. */
  recompute(fromEl: HTMLElement): void {
    const pane = fromEl.closest<HTMLElement>(".markdown-source-view, .markdown-preview-view");
    if (pane) this.applyTo(pane);
  }

  recomputeAll(): void {
    for (const pane of document.querySelectorAll<HTMLElement>(
      ".markdown-source-view, .markdown-preview-view",
    )) {
      this.applyTo(pane);
    }
  }

  private applyTo(pane: HTMLElement): void {
    const qualifies =
      this.plugin.settings.wideNotes && pane.querySelector(".aib-container, .bases-view") !== null;
    pane.classList.toggle(WIDE_CLASS, qualifies);
  }
}
