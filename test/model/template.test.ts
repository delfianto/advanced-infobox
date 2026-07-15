import { describe, expect, it } from "vitest";
import { parseTemplate, type TemplateSource } from "src/model/template";

/**
 * Builds a TemplateSource from markdown-ish body text by scanning for
 * headings and top-level list items the way Obsidian's cache would report
 * them (absolute offsets). Keeps tests readable without re-implementing a
 * markdown parser: only `## Heading` and `- item` lines are recognized.
 */
function source(
  frontmatter: Record<string, unknown> | undefined,
  body = "",
  id = "person",
): TemplateSource {
  const headings: TemplateSource["headings"] = [];
  const listItems: TemplateSource["listItems"] = [];
  let offset = 0;
  for (const line of body.split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      headings.push({ text: line.replace(/^#{1,6}\s+/, "").trim(), offset });
    } else if (/^\s*-\s/.test(line)) {
      const indented = /^\s+-/.test(line);
      listItems.push({
        start: offset,
        end: offset + line.length,
        // Obsidian reports nested items with a non-negative parent.
        parent: indented ? 1 : -1,
      });
    }
    offset += line.length + 1;
  }
  return { id, frontmatter, headings, listItems, body };
}

describe("parseTemplate", () => {
  it("reads labels and order from frontmatter", () => {
    const t = parseTemplate(source({ born: "Born", eye_color: "Eye Color" }));
    expect(t.labels).toEqual({ born: "Born", eye_color: "Eye Color" });
    expect(t.order).toEqual(["born", "eye_color"]);
    expect(t.sections).toEqual([]);
  });

  it("keeps keys with non-string frontmatter values in order, without labels", () => {
    const t = parseTemplate(source({ born: "Born", level: 7 }));
    expect(t.order).toEqual(["born", "level"]);
    expect(t.labels).toEqual({ born: "Born" });
  });

  it("builds sections from headings and list items", () => {
    const body = ["## Personal", "- born", "- died", "", "## Career", "- occupation"].join("\n");
    const t = parseTemplate(source({ born: "Born" }, body));
    expect(t.sections).toEqual([
      { label: "Personal", keys: ["born", "died"] },
      { label: "Career", keys: ["occupation"] },
    ]);
  });

  it("lets body items override labels in place", () => {
    const body = ["## Combat", "- armor_class: AC", "- hit_points: HP"].join("\n");
    const t = parseTemplate(source({ armor_class: "Armor Class" }, body));
    expect(t.labels["armor_class"]).toBe("AC");
    expect(t.labels["hit_points"]).toBe("HP");
    expect(t.sections[0].keys).toEqual(["armor_class", "hit_points"]);
  });

  it("puts items before the first heading into an unlabeled section", () => {
    const body = ["- race", "", "## Detail", "- born"].join("\n");
    const t = parseTemplate(source({}, body));
    expect(t.sections).toEqual([{ keys: ["race"] }, { label: "Detail", keys: ["born"] }]);
  });

  it("ignores nested list items", () => {
    const body = ["## S", "- parent_key", "  - nested_ignored"].join("\n");
    const t = parseTemplate(source({}, body));
    expect(t.sections[0].keys).toEqual(["parent_key"]);
  });

  it("unwraps wikilinked keys", () => {
    const body = ["## S", "- [[born]]"].join("\n");
    const t = parseTemplate(source({}, body));
    expect(t.sections[0].keys).toEqual(["born"]);
  });

  it("honors the reserved unlisted key without treating it as a field", () => {
    const t = parseTemplate(source({ unlisted: "hide", born: "Born" }));
    expect(t.unlisted).toBe("hide");
    expect(t.order).toEqual(["born"]);
    expect(t.labels["unlisted"]).toBeUndefined();
  });

  it("ignores invalid unlisted values", () => {
    const t = parseTemplate(source({ unlisted: "maybe" }));
    expect(t.unlisted).toBeUndefined();
  });

  it("drops sections whose headings have no items", () => {
    const body = ["## Empty", "", "## Full", "- born"].join("\n");
    const t = parseTemplate(source({}, body));
    expect(t.sections).toEqual([{ label: "Full", keys: ["born"] }]);
  });
});
