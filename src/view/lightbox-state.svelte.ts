/**
 * Reactive state for the lightbox: the current slide plus the resolved resource
 * URLs (a null entry marks a spec that did not resolve to a file), in the
 * note's wikilink order. Lives in a .svelte.ts module so `$state` is available
 * outside a component; it is mutated by both the modal's keyboard handlers and
 * the mounted component's buttons, mirroring how InfoboxModel is driven by
 * InfoboxRenderChild.
 */
export class LightboxState {
  index = $state(0);

  constructor(
    readonly urls: (string | null)[],
    index: number,
  ) {
    this.index = Math.max(0, Math.min(index, urls.length - 1));
  }

  first(): void {
    this.index = 0;
  }

  last(): void {
    this.index = Math.max(0, this.urls.length - 1);
  }

  prev(): void {
    if (this.index > 0) this.index--;
  }

  next(): void {
    if (this.index < this.urls.length - 1) this.index++;
  }
}
