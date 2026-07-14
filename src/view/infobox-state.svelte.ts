import type { InfoboxViewModel } from "src/model/schema";
import type { ArrayStyle } from "src/settings/settings";

/**
 * Reactive bridge between the imperative render child and the Svelte
 * component: the child assigns, the component reacts. Lives in a .svelte.ts
 * module so runes are available outside a component.
 */
export class InfoboxModel {
  vm = $state<InfoboxViewModel | null>(null);
  /** Problems from the anchor block's options, shown inline. */
  errors = $state<string[]>([]);
  arrayStyle = $state<ArrayStyle>("list");
}

/**
 * Rendering services the component needs from the Obsidian runtime, passed
 * as bound closures so the component itself never imports "obsidian".
 */
export interface RenderContext {
  /** Renders markdown (wikilinks, tags, formatting) into the element. */
  renderMarkdown: (markdown: string, el: HTMLElement) => void;
  /** Raw image spec (wikilink / vault path / URL) → resource URL, or null. */
  resolveImage: (raw: string) => string | null;
}
