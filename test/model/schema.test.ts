import { describe, expect, it } from "vitest";
import { buildViewModel, type ViewModelInput } from "src/model/schema";
import { DEFAULT_SETTINGS } from "src/settings/settings";

function input(overrides: Partial<ViewModelInput>): ViewModelInput {
  return {
    frontmatter: undefined,
    fileBasename: "Untitled",
    settings: { ...DEFAULT_SETTINGS },
    blockConfig: {},
    ...overrides,
  };
}

/** Convenience: all field keys across sections, in render order. */
function keys(vm: ReturnType<typeof buildViewModel>): string[] {
  return vm.sections.flatMap((s) => s.fields.map((f) => f.key));
}

describe("buildViewModel", () => {
  it("marks notes without frontmatter as bare, titled by filename", () => {
    const vm = buildViewModel(input({ fileBasename: "Albert Einstein" }));
    expect(vm.bare).toBe(true);
    expect(vm.title).toBe("Albert Einstein");
    expect(vm.sections).toEqual([]);
  });

  it("treats empty frontmatter as bare", () => {
    const vm = buildViewModel(input({ frontmatter: {} }));
    expect(vm.bare).toBe(true);
  });

  it("maps special keys and keeps remaining fields in file order", () => {
    const vm = buildViewModel(
      input({
        frontmatter: {
          title: "Albert Einstein",
          subtitle: "Theoretical physicist",
          image: "[[einstein-1921.jpg]]",
          caption: "Photograph from 1921",
          born: "1879-03-14",
          died: "1955-04-18",
          tags: ["science", "physics"],
        },
      }),
    );
    expect(vm.bare).toBe(false);
    expect(vm.title).toBe("Albert Einstein");
    expect(vm.subtitle).toBe("Theoretical physicist");
    expect(vm.image).toBe("[[einstein-1921.jpg]]");
    expect(vm.caption).toBe("Photograph from 1921");
    expect(vm.tags).toEqual(["science", "physics"]);
    expect(vm.sections).toHaveLength(1);
    expect(vm.sections[0].label).toBeUndefined();
    expect(keys(vm)).toEqual(["born", "died"]);
    expect(vm.sections[0].fields[0]).toEqual({
      key: "born",
      label: "Born",
      value: { kind: "date", iso: "1879-03-14" },
    });
  });

  it("applies custom label overrides case-insensitively, beating prettify", () => {
    const vm = buildViewModel(
      input({
        frontmatter: { HP: 59, armor_class: 18 },
        settings: { ...DEFAULT_SETTINGS, labelMap: { hp: "Hit Points", armor_class: "AC" } },
      }),
    );
    expect(vm.sections[0].fields.map((f) => f.label)).toEqual(["Hit Points", "AC"]);
  });

  it("falls back to the filename when the title key is absent", () => {
    const vm = buildViewModel(input({ frontmatter: { born: "1879" }, fileBasename: "Einstein" }));
    expect(vm.title).toBe("Einstein");
  });

  it("applies global excludes case-insensitively", () => {
    const vm = buildViewModel(
      input({
        frontmatter: { Draft: true, born: "1879" },
        settings: { ...DEFAULT_SETTINGS, excludeKeys: ["draft"] },
      }),
    );
    expect(keys(vm)).toEqual(["born"]);
  });

  it("applies block-config excludes on top of global ones", () => {
    const vm = buildViewModel(
      input({
        frontmatter: { born: "1879", died: "1955" },
        blockConfig: { exclude: ["died"] },
      }),
    );
    expect(keys(vm)).toEqual(["born"]);
  });

  it("lets the block config override image and caption", () => {
    const vm = buildViewModel(
      input({
        frontmatter: { image: "fm.png", caption: "from frontmatter" },
        blockConfig: { image: "override.png", caption: "from block" },
      }),
    );
    expect(vm.image).toBe("override.png");
    expect(vm.caption).toBe("from block");
  });

  it("drops empty values instead of rendering blank rows", () => {
    const vm = buildViewModel(input({ frontmatter: { born: "", spouse: null, field: "Physics" } }));
    expect(keys(vm)).toEqual(["field"]);
  });

  it("hides tags when showTags is off", () => {
    const vm = buildViewModel(
      input({
        frontmatter: { tags: ["a"], born: "x" },
        settings: { ...DEFAULT_SETTINGS, showTags: false },
      }),
    );
    expect(vm.tags).toEqual([]);
  });

  it("never renders the special keys as fields", () => {
    const vm = buildViewModel(
      input({
        frontmatter: { title: "T", subtitle: "S", image: "i.png", caption: "C", tags: ["t"] },
      }),
    );
    expect(vm.sections).toEqual([]);
  });

  describe("sections", () => {
    const frontmatter = {
      race: "Dwarf",
      class: "Paladin",
      strength: 16,
      dexterity: 8,
      languages: ["Common", "Dwarvish"],
    };

    it("groups fields under labeled sections in spec order", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: {
            sections: [
              { label: "Identity", keys: ["class", "race"] },
              { label: "Abilities", keys: ["strength", "dexterity"] },
            ],
          },
        }),
      );
      expect(vm.sections.map((s) => s.label)).toEqual(["Identity", "Abilities", undefined]);
      expect(vm.sections[0].fields.map((f) => f.key)).toEqual(["class", "race"]);
      expect(vm.sections[1].fields.map((f) => f.key)).toEqual(["strength", "dexterity"]);
      // Leftovers land in a trailing unlabeled section.
      expect(vm.sections[2].fields.map((f) => f.key)).toEqual(["languages"]);
    });

    it("hides unlisted fields when unlisted is hide", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: {
            sections: [{ label: "Identity", keys: ["race", "class"] }],
            unlisted: "hide",
          },
        }),
      );
      expect(vm.sections.map((s) => s.label)).toEqual(["Identity"]);
      expect(keys(vm)).toEqual(["race", "class"]);
    });

    it("matches section keys case-insensitively", () => {
      const vm = buildViewModel(
        input({
          frontmatter: { Race: "Dwarf" },
          blockConfig: { sections: [{ label: "Identity", keys: ["race"] }] },
        }),
      );
      expect(vm.sections[0].fields.map((f) => f.key)).toEqual(["Race"]);
    });

    it("skips keys the note does not have and drops empty sections", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: {
            sections: [
              { label: "Nope", keys: ["missing", "also_missing"] },
              { label: "Identity", keys: ["race", "missing"] },
            ],
          },
        }),
      );
      expect(vm.sections.map((s) => s.label)).toEqual(["Identity", undefined]);
    });

    it("never lists a field twice even if two sections claim it", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: {
            sections: [
              { label: "A", keys: ["race"] },
              { label: "B", keys: ["race", "class"] },
            ],
          },
        }),
      );
      expect(vm.sections[0].fields.map((f) => f.key)).toEqual(["race"]);
      expect(vm.sections[1].fields.map((f) => f.key)).toEqual(["class"]);
    });

    it("uses template body sections when the block has none", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          template: {
            id: "character",
            labels: { race: "Ancestry" },
            order: [],
            sections: [{ label: "Identity", keys: ["race", "class"] }],
          },
        }),
      );
      expect(vm.sections.map((s) => s.label)).toEqual(["Identity", undefined]);
      expect(vm.sections[0].fields.map((f) => f.label)).toEqual(["Ancestry", "Class"]);
    });

    it("falls back to template frontmatter order when body has no sections", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          template: {
            id: "character",
            labels: {},
            order: ["class", "race"],
            sections: [],
            unlisted: "hide",
          },
        }),
      );
      expect(vm.sections).toHaveLength(1);
      expect(vm.sections[0].label).toBeUndefined();
      expect(keys(vm)).toEqual(["class", "race"]);
    });

    it("lets block sections beat template sections", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: { sections: [{ label: "Block", keys: ["race"] }], unlisted: "hide" },
          template: {
            id: "character",
            labels: {},
            order: [],
            sections: [{ label: "Template", keys: ["class"] }],
          },
        }),
      );
      expect(vm.sections.map((s) => s.label)).toEqual(["Block"]);
    });

    it("template labels beat the global label map", () => {
      const vm = buildViewModel(
        input({
          frontmatter: { race: "Dwarf" },
          settings: { ...DEFAULT_SETTINGS, labelMap: { race: "Global" } },
          template: { id: "t", labels: { race: "Template" }, order: [], sections: [] },
        }),
      );
      expect(vm.sections[0].fields[0].label).toBe("Template");
    });

    it("block unlisted beats template unlisted", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: { unlisted: "show" },
          template: {
            id: "t",
            labels: {},
            order: ["race"],
            sections: [],
            unlisted: "hide",
          },
        }),
      );
      // Template says hide, block says show — everything renders.
      expect(keys(vm)).toEqual(["race", "class", "strength", "dexterity", "languages"]);
    });

    it("never renders the template property itself as a field", () => {
      const vm = buildViewModel(input({ frontmatter: { infobox: "person", born: "x" } }));
      expect(keys(vm)).toEqual(["born"]);
    });

    it("respects excludes inside sections", () => {
      const vm = buildViewModel(
        input({
          frontmatter,
          blockConfig: {
            sections: [{ label: "Identity", keys: ["race", "class"] }],
            exclude: ["class"],
            unlisted: "hide",
          },
        }),
      );
      expect(keys(vm)).toEqual(["race"]);
    });
  });
});
