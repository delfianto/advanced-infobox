import { type App, TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import { TemplateRegistry } from "src/model/template-registry";

interface FakeFile {
  path: string;
  basename: string;
  frontmatter?: Record<string, unknown>;
  body?: string;
}

/**
 * A registry backed by a fake vault/metadataCache. Template notes are plain
 * data; `cachedRead` counts calls so the caching behaviour can be asserted.
 * TFile instances come from the (runtime) obsidian mock so the registry's
 * `instanceof TFile` check passes.
 */
function makeRegistry(files: FakeFile[], folder = "Templates/Infobox") {
  let reads = 0;
  const tfiles = files.map((f) =>
    Object.assign(new TFile(), { path: f.path, basename: f.basename }),
  );
  const byPath = (path: string): FakeFile | undefined => files.find((f) => f.path === path);
  const app = {
    vault: {
      getMarkdownFiles: () => tfiles,
      getAbstractFileByPath: (path: string) => tfiles.find((t) => t.path === path) ?? null,
      cachedRead: (file: TFile) => {
        reads += 1;
        return Promise.resolve(byPath(file.path)?.body ?? "");
      },
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const src = byPath(file.path);
        return src ? { frontmatter: src.frontmatter, headings: [], listItems: [] } : null;
      },
    },
  };
  return {
    registry: new TemplateRegistry(app as unknown as App, () => folder),
    reads: () => reads,
  };
}

const person: FakeFile = {
  path: "Templates/Infobox/person.md",
  basename: "person",
  frontmatter: { race: "Race", class: "Class" },
  body: "",
};
const place: FakeFile = {
  path: "Templates/Infobox/place.md",
  basename: "place",
  frontmatter: { region: "Region" },
  body: "",
};
const outside: FakeFile = { path: "Notes/Hero.md", basename: "Hero", body: "" };

describe("TemplateRegistry", () => {
  it("lists folder-scoped template ids, sorted", () => {
    const { registry } = makeRegistry([place, person, outside]);
    expect(registry.ids()).toEqual(["person", "place"]);
  });

  it("recognizes files inside the template folder", () => {
    const { registry } = makeRegistry([]);
    expect(registry.contains("Templates/Infobox/person.md")).toBe(true);
    expect(registry.contains("Notes/Hero.md")).toBe(false);
  });

  it("resolves an existing template from its note frontmatter", async () => {
    const { registry } = makeRegistry([person]);
    const template = await registry.resolve("person");
    expect(template?.order).toEqual(["race", "class"]);
    expect(template?.labels).toEqual({ race: "Race", class: "Class" });
  });

  it("returns null for a template note that doesn't exist", async () => {
    const { registry } = makeRegistry([person]);
    expect(await registry.resolve("ghost")).toBeNull();
  });

  it("caches a resolved template until it is invalidated", async () => {
    const { registry, reads } = makeRegistry([person, place]);
    await registry.resolve("person");
    await registry.resolve("person");
    expect(reads()).toBe(1);

    registry.invalidate("Templates/Infobox/person.md");
    await registry.resolve("person");
    expect(reads()).toBe(2);

    // Calling invalidate with no argument clears the whole cache.
    registry.invalidate();
    await registry.resolve("person");
    await registry.resolve("place");
    expect(reads()).toBe(4);
  });
});
