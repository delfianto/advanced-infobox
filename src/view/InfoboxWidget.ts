import type AdvancedInfoboxPlugin from "src/main";
import { AUTO_EMBED_CLASS } from "src/model/auto-embed";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";
import { WidgetType } from "@codemirror/view";

/**
 * The render child is keyed by its DOM element, not by the widget instance:
 * when two widgets are `eq`, CodeMirror keeps the existing DOM but may swap in
 * the newer widget instance, so a child stored on the instance would leak. The
 * DOM element that `toDOM` produced is exactly what `destroy` is handed back.
 */
const childByDom = new WeakMap<HTMLElement, InfoboxRenderChild>();

/**
 * Wraps the ordinary render child as a CM6 block widget for Live Preview
 * auto-embed. Equality is by note path so CodeMirror keeps the DOM (and the
 * live child, which self-refreshes on metadata changes) across edits rather
 * than remounting on every keystroke.
 */
export class InfoboxWidget extends WidgetType {
  constructor(
    private readonly plugin: AdvancedInfoboxPlugin,
    private readonly sourcePath: string,
  ) {
    super();
  }

  override eq(other: InfoboxWidget): boolean {
    return other.sourcePath === this.sourcePath;
  }

  override toDOM(): HTMLElement {
    const container = createDiv({ cls: AUTO_EMBED_CLASS });
    const child = new InfoboxRenderChild(container, this.plugin, "", this.sourcePath);
    childByDom.set(container, child);
    child.load();
    return container;
  }

  override destroy(dom: HTMLElement): void {
    childByDom.get(dom)?.unload();
    childByDom.delete(dom);
  }

  // Let the widget own its clicks (collapse toggle, links) and keep the editor
  // from moving the caret into it.
  override ignoreEvent(): boolean {
    return true;
  }

  // Height varies with the note; let CodeMirror measure it.
  override get estimatedHeight(): number {
    return -1;
  }
}
