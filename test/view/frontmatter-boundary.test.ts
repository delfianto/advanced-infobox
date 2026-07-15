import { describe, expect, it } from "vitest";
import { bodyStart } from "src/view/frontmatter-boundary";
import { EditorState } from "@codemirror/state";

function state(doc: string): EditorState {
  return EditorState.create({ doc });
}

/** The 1-based line number a position falls on, for readable assertions. */
function lineAt(doc: string, pos: number): number {
  return state(doc).doc.lineAt(pos).number;
}

describe("bodyStart", () => {
  it("returns null when there is no frontmatter", () => {
    expect(bodyStart(state(""))).toBeNull();
    expect(bodyStart(state("# Title\n\nJust prose, no frontmatter."))).toBeNull();
    // A single "---" line never closes the block.
    expect(bodyStart(state("---"))).toBeNull();
  });

  it("returns null for an unterminated frontmatter block", () => {
    expect(bodyStart(state("---\ninfobox: person\ntitle: X\n"))).toBeNull();
  });

  it("returns null when --- is not on the very first line", () => {
    expect(bodyStart(state("\n---\ninfobox: person\n---\nBody"))).toBeNull();
  });

  it("anchors at the first body line, before its content", () => {
    const doc = "---\ninfobox: person\ntitle: X\n---\n\nBody text";
    const result = bodyStart(state(doc));
    expect(result?.side).toBe(-1);
    // Line 5 is the blank line immediately after the closing ---.
    expect(lineAt(doc, result!.pos)).toBe(5);
  });

  it("anchors at the end of a frontmatter-only note", () => {
    const doc = "---\ninfobox: true\n---";
    const result = bodyStart(state(doc));
    expect(result).toEqual({ pos: doc.length, side: 1 });
  });

  it("uses the first closing fence, not a later one", () => {
    const doc = "---\ninfobox: person\n---\n\nBody with a --- rule\n";
    const result = bodyStart(state(doc));
    expect(result?.side).toBe(-1);
    // Line 4 is right after the real closing fence on line 3.
    expect(lineAt(doc, result!.pos)).toBe(4);
  });
});
