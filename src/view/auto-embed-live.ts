import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import { type EditorState, StateEffect, StateField } from "@codemirror/state";
import { hasInfoboxAnchor, qualifiesForAutoEmbed } from "src/model/auto-embed";
import type AdvancedInfoboxPlugin from "src/main";
import { bodyStart } from "src/view/frontmatter-boundary";
import { InfoboxWidget } from "src/view/InfoboxWidget";

/**
 * Live Preview auto-embed: a CM6 block widget below the Properties widget,
 * mounting the same render child the code block and reading view use.
 *
 * Delivered as a StateField, not a ViewPlugin — CodeMirror forbids block
 * decorations from plugins ("Block decorations may not be specified via
 * plugins"), and a MarkdownView always builds its editor sub-view, so a plugin
 * here would throw during setViewData and break the whole note load. The file
 * comes from Obsidian's `editorInfoField`, so no view/leaf lookup is needed.
 */

/** Forces the field to rebuild — dispatched on settings/metadata changes. */
export const autoEmbedRefresh = StateEffect.define<null>();

function buildDecorations(plugin: AdvancedInfoboxPlugin, state: EditorState): DecorationSet {
  if (!plugin.settings.autoEmbed) return Decoration.none;
  // Only Live Preview renders widgets; raw Source mode shows plain text.
  if (!state.field(editorLivePreviewField, false)) return Decoration.none;

  const file = state.field(editorInfoField, false)?.file ?? null;
  if (!file) return Decoration.none;

  const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!qualifiesForAutoEmbed(frontmatter, plugin.settings)) return Decoration.none;

  // Defer to an explicit ```infobox``` block, exactly like reading view.
  if (hasInfoboxAnchor(state.doc.toString())) return Decoration.none;

  const at = bodyStart(state);
  if (!at) return Decoration.none;

  return Decoration.set([
    Decoration.widget({
      widget: new InfoboxWidget(plugin, file.path),
      block: true,
      side: at.side,
    }).range(at.pos),
  ]);
}

/** The editor extension to register for Live Preview auto-embed. */
export function autoEmbedExtension(plugin: AdvancedInfoboxPlugin): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(plugin, state);
    },
    update(deco, tr) {
      // Frontmatter/trigger or anchor changes ride the doc; enable/disable and
      // metadata-settle arrive as the refresh effect. Otherwise just reposition.
      if (tr.docChanged || tr.effects.some((e) => e.is(autoEmbedRefresh))) {
        return buildDecorations(plugin, tr.state);
      }
      // No doc change and no refresh: offsets are unchanged, keep as-is.
      return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}
