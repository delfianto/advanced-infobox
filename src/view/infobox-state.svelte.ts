import { type ArrayStyle, type BooleanStyle } from "src/settings/settings";
import { type InfoboxViewModel } from "src/model/schema";

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
  booleanStyle = $state<BooleanStyle>("check");
  /** Collapse affordance enabled (Live Preview only; CSS gates the effect). */
  collapsible = $state(false);
  collapsed = $state(false);
  /** In-box editing enabled (mirrors settings.editInBox); gates field editors. */
  editEnabled = $state(false);
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
  /** ISO date string → user-formatted date (settings.dateFormat). */
  formatDate: (iso: string) => string;
  /** Remembers the user's collapse toggle across CM6 widget remounts. */
  persistCollapse: (collapsed: boolean) => void;
  /** Writes a scalar edit straight to the note's frontmatter. */
  commitField: (key: string, value: string | number | boolean) => void;
  /** Bracket a focused edit so refreshes defer until it settles (echo-loop guard). */
  beginEdit: () => void;
  endEdit: () => void;
}
