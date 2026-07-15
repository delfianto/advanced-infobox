import { type EditorState } from "@codemirror/state";

/**
 * Where an auto-embed block widget should anchor in a Live Preview editor:
 * just after the note's frontmatter, so the box lands below the Properties
 * widget. Returns the start of the first body line (or the end of the doc for
 * a frontmatter-only note) plus the CM6 `side` to use there.
 *
 * Null when the document has no closed frontmatter block — Obsidian only
 * recognizes frontmatter that opens with `---` on the very first line.
 * Kept free of the Obsidian and Svelte runtimes so it can be unit-tested
 * against a bare EditorState.
 */
export function bodyStart(state: EditorState): { pos: number; side: number } | null {
  const { doc } = state;
  if (doc.lines < 2 || doc.line(1).text.trim() !== "---") return null;
  for (let i = 2; i <= doc.lines; i++) {
    if (doc.line(i).text.trim() === "---") {
      return i < doc.lines
        ? { pos: doc.line(i + 1).from, side: -1 }
        : { pos: doc.line(i).to, side: 1 };
    }
  }
  return null;
}
