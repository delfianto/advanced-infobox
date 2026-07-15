import { type App, type Component, MarkdownRenderer } from "obsidian";

/**
 * Bound markdown renderer for one note. `owner` ties rendered embeds/links
 * to the render child's lifecycle so Obsidian unloads them with the widget.
 */
export function createMarkdownRenderer(
  app: App,
  sourcePath: string,
  owner: Component,
): (markdown: string, el: HTMLElement) => Promise<void> {
  return async (markdown, el) => {
    while (el.firstChild) el.firstChild.remove();
    await MarkdownRenderer.render(app, markdown, el, sourcePath, owner);
  };
}
