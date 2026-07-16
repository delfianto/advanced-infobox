import { type App, Modal } from "obsidian";
import { mount, unmount } from "svelte";
import Lightbox from "src/view/Lightbox.svelte";
import { LightboxState } from "src/view/lightbox-state.svelte";

/**
 * A full-viewport image viewer built on Obsidian's Modal, so focus trap,
 * Escape-to-close, backdrop, and scroll lock come for free. Arrow/Home/End
 * drive the shared LightboxState (registered on the modal's own Scope, which
 * Obsidian pushes on open and pops on close); the mounted Lightbox.svelte
 * reacts. The resolved URLs are a snapshot — the viewer does not track live
 * vault changes while open.
 */
export class LightboxModal extends Modal {
  private readonly state: LightboxState;
  private component: Record<string, unknown> | null = null;

  constructor(app: App, urls: (string | null)[], index: number) {
    super(app);
    this.state = new LightboxState(urls, index);
  }

  override onOpen(): void {
    this.modalEl.addClass("aib-lightbox");
    this.containerEl.addClass("aib-lightbox-container");
    this.component = mount(Lightbox, {
      target: this.contentEl,
      props: { state: this.state },
    });
    this.scope.register([], "ArrowLeft", () => {
      this.state.prev();
      return false;
    });
    this.scope.register([], "ArrowRight", () => {
      this.state.next();
      return false;
    });
    this.scope.register([], "Home", () => {
      this.state.first();
      return false;
    });
    this.scope.register([], "End", () => {
      this.state.last();
      return false;
    });
  }

  override onClose(): void {
    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }
    this.contentEl.empty();
  }
}
