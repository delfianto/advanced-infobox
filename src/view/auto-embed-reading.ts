import { AUTO_EMBED_CLASS, hasInfoboxAnchor, qualifiesForAutoEmbed } from "src/model/auto-embed";
import { type MarkdownPostProcessor, type MarkdownPostProcessorContext } from "obsidian";
import type AdvancedInfoboxPlugin from "src/main";
import { InfoboxRenderChild } from "src/view/InfoboxRenderChild";

/**
 * Reading-view auto-embed. Obsidian calls this once per rendered section; we
 * mount the ordinary render child a single time, at the top of the note, and
 * only when the note qualifies and has no explicit ```infobox``` block. The
 * happy path is deliberately the same widget the code block uses — auto-embed
 * changes *where* it mounts, never *what* renders.
 */
export function autoEmbedReadingProcessor(plugin: AdvancedInfoboxPlugin): MarkdownPostProcessor {
  return (el, ctx) => {
    const frontmatter = ctx.frontmatter as Record<string, unknown> | undefined;
    if (!qualifiesForAutoEmbed(frontmatter, plugin.settings)) return;

    // Obsidian often runs the post-processor on a section element before it is
    // attached to the preview (and sometimes on throwaway detached copies), so
    // `el.closest(sizer)` is null at call time. Poll briefly: inject the moment
    // the element and its `.markdown-preview-sizer` ancestor are in place, and
    // give up on copies that never attach.
    const win = el.ownerDocument.defaultView ?? globalThis;
    let tries = 0;
    const tick = (): void => {
      if (tryInject(el, ctx, plugin)) return;
      if (++tries <= 20) win.setTimeout(tick, 50);
    };
    tick();
  };
}

/**
 * Returns true once the outcome is settled (injected, or a deliberate skip),
 * false while the element is not attached yet and the caller should retry.
 */
function tryInject(
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: AdvancedInfoboxPlugin,
): boolean {
  // Detached: it may attach in a later tick, or be a throwaway copy.
  if (!el.isConnected) return false;
  // Live Preview (its own CM6 widget), a transclusion, or a hover popover: none
  // should auto-embed — cloning the box into every embed is the failure mode.
  if (el.closest(".markdown-embed, .internal-embed, .popover")) return true;
  // Not inside a reading-view preview (yet).
  const sizer = el.closest(".markdown-preview-sizer");
  if (!(sizer instanceof HTMLElement)) return false;

  // One box per render. The marker is our own injected element, so a preview
  // rebuild (which clears the sizer) naturally re-arms this.
  if (sizer.querySelector(`:scope > .${AUTO_EMBED_CLASS}`)) return true;

  // Defer to an explicit block. getSectionInfo can return null for synthetic
  // elements; treat that as "not ready" and wait rather than risk
  // double-rendering over an anchor block.
  const info = ctx.getSectionInfo(el);
  if (!info) return false;
  if (hasInfoboxAnchor(info.text)) return true;

  const container = createDiv({ cls: AUTO_EMBED_CLASS });
  // Below the inline title (and scroll pusher) so a floated box hugs the top of
  // the prose, wiki-style, instead of sitting above the note title.
  const anchor =
    sizer.querySelector(":scope > .inline-title") ??
    sizer.querySelector(":scope > .markdown-preview-pusher");
  if (anchor) anchor.after(container);
  else sizer.prepend(container);

  ctx.addChild(new InfoboxRenderChild(container, plugin, "", ctx.sourcePath));
  return true;
}
