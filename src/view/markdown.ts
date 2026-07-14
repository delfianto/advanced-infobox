import { MarkdownRenderer, type App, type Component } from "obsidian";

/**
 * Bound markdown renderer for one note. `owner` ties rendered embeds/links
 * to the render child's lifecycle so Obsidian unloads them with the widget.
 */
export function createMarkdownRenderer(
  app: App,
  sourcePath: string,
  owner: Component,
): (markdown: string, el: HTMLElement) => void {
  return (markdown, el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    void MarkdownRenderer.render(app, markdown, el, sourcePath, owner);
  };
}
