import type AdvancedInfoboxPlugin from "src/main";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";
import { TFile } from "obsidian";

const SHOW_DELAY = 250;
const HIDE_DELAY = 200;
const GAP = 8;

/**
 * Shows a note's infobox in a floating popover when the pointer rests on its
 * link inside a Bases view — the "row → infobox hover card" (PLAN_PHASE4 §8).
 *
 * Best-effort by nature: it reads Bases' rendered DOM (`.bases-view` and the
 * `[data-href]` links Bases renders for file references), so it simply no-ops
 * on Obsidian builds without Bases, and degrades to nothing if that structure
 * ever changes. The popover reuses the ordinary infobox pipeline via a
 * standalone {@link InfoboxRenderChild}, so it looks identical to the in-note
 * box and live-updates if the note changes while open.
 */
export class BasesHoverPreview {
  private popover: HTMLElement | null = null;
  private child: InfoboxRenderChild | null = null;
  private path: string | null = null;
  private showTimer = 0;
  private hideTimer = 0;

  constructor(private readonly plugin: AdvancedInfoboxPlugin) {}

  register(): void {
    this.plugin.registerDomEvent(document, "mouseover", (evt) => this.onMouseOver(evt));
    // A base scrolls independently of the popover; drop it rather than let it
    // drift — but not while the pointer is scrolling the popover itself.
    this.plugin.registerDomEvent(
      document,
      "scroll",
      (evt) => {
        if (this.popover && this.popover.contains(evt.target as Node)) return;
        this.hide();
      },
      true,
    );
  }

  destroy(): void {
    this.hide();
  }

  private onMouseOver(evt: MouseEvent): void {
    if (!this.plugin.settings.basesHoverPreview) return;
    const target = evt.target as HTMLElement | null;
    if (!target?.closest) return;

    // Keep the popover open while the pointer is inside it.
    if (this.popover && target.closest(".aib-hover-popover")) {
      this.cancelHide();
      return;
    }

    const link = target.closest<HTMLElement>(".bases-view [data-href]");
    const href = link?.dataset.href;
    if (!link || !href) {
      this.scheduleHide();
      return;
    }
    const file = this.plugin.app.metadataCache.getFirstLinkpathDest(href, "");
    if (!(file instanceof TFile) || file.extension !== "md") {
      this.scheduleHide();
      return;
    }
    if (file.path === this.path) {
      this.cancelHide();
      return;
    }

    this.cancelHide();
    globalThis.clearTimeout(this.showTimer);
    this.showTimer = globalThis.setTimeout(() => this.show(file, link), SHOW_DELAY);
  }

  private show(file: TFile, anchor: HTMLElement): void {
    this.teardown();
    this.path = file.path;

    const pop = document.body.createDiv({ cls: "aib-hover-popover" });
    const child = new InfoboxRenderChild(pop.createDiv(), this.plugin, "", file.path);
    this.popover = pop;
    this.child = child;
    pop.addEventListener("mouseenter", () => this.cancelHide());
    pop.addEventListener("mouseleave", () => this.scheduleHide());

    child.load();
    this.position(pop, anchor);
    // The box fills in asynchronously (template + per-cell markdown); reposition
    // once its real height is known so a tall sheet still fits the viewport.
    void this.repositionWhenReady(pop, anchor, child);
  }

  private async repositionWhenReady(
    pop: HTMLElement,
    anchor: HTMLElement,
    child: InfoboxRenderChild,
  ): Promise<void> {
    await child.rendered;
    if (this.popover === pop) this.position(pop, anchor);
  }

  private position(pop: HTMLElement, anchor: HTMLElement): void {
    const a = anchor.getBoundingClientRect();
    const { offsetWidth: pw, offsetHeight: ph } = pop;
    let left = a.right + GAP;
    if (left + pw > globalThis.innerWidth - GAP) left = Math.max(GAP, a.left - pw - GAP);
    let { top } = a;
    if (top + ph > globalThis.innerHeight - GAP) {
      top = Math.max(GAP, globalThis.innerHeight - ph - GAP);
    }
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  private scheduleHide(): void {
    if (!this.popover) return;
    globalThis.clearTimeout(this.hideTimer);
    this.hideTimer = globalThis.setTimeout(() => this.hide(), HIDE_DELAY);
  }

  private cancelHide(): void {
    globalThis.clearTimeout(this.hideTimer);
  }

  private hide(): void {
    globalThis.clearTimeout(this.showTimer);
    globalThis.clearTimeout(this.hideTimer);
    this.teardown();
  }

  private teardown(): void {
    this.child?.unload();
    this.child = null;
    this.popover?.remove();
    this.popover = null;
    this.path = null;
  }
}
