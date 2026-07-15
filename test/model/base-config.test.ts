import { type BaseConfig, type BaseGenInput, buildBaseConfig } from "src/model/base-config";
import { describe, expect, it } from "vitest";
import { type InfoboxTemplate } from "src/model/template";

const dnd: InfoboxTemplate = {
  id: "dnd",
  order: ["race", "class", "level", "alignment", "background", "player"],
  // race and hit_dice equal their prettified form, so they must NOT yield a
  // displayName; the others differ from prettify and should.
  labels: {
    race: "Race",
    strength: "STR",
    armor_class: "AC",
    hit_points: "HP",
    hit_dice: "Hit Dice",
    proficiency_bonus: "Proficiency",
    spell_save_dc: "Spell Save DC",
  },
  sections: [
    { label: "Identity", keys: ["race", "class", "level", "background", "alignment", "player"] },
    { label: "Ability Scores", keys: ["strength", "dexterity", "constitution"] },
    { label: "Combat", keys: ["armor_class", "hit_points"] },
  ],
};

const base = (over: Partial<BaseGenInput> = {}): BaseConfig =>
  buildBaseConfig({
    folder: "Characters",
    template: dnd,
    templateKey: "infobox",
    templateId: "dnd",
    titleKey: "title",
    imageKey: "image",
    hasImages: false,
    fallbackKeys: [],
    ...over,
  });

describe("buildBaseConfig", () => {
  it("scopes the filter to the folder and the template property", () => {
    expect(base().filters).toEqual({
      and: ['file.inFolder("Characters")', 'note.infobox == "dnd"'],
    });
  });

  it("emits a bare folder filter when no template was detected", () => {
    const cfg = base({ template: null, templateId: null, fallbackKeys: ["a", "b"] });
    expect(cfg.filters).toBe('file.inFolder("Characters")');
  });

  it("leads the table with file.name then the template's first section", () => {
    const table = base().views.find((v) => v.type === "table");
    expect(table?.order).toEqual([
      "file.name",
      "note.race",
      "note.class",
      "note.level",
      "note.background",
      "note.alignment",
      "note.player",
    ]);
    expect(table?.sort).toEqual([{ property: "file.name", direction: "ASC" }]);
  });

  it("builds a cards view with a title and a bounded field set", () => {
    const cards = base().views.find((v) => v.type === "cards");
    expect(cards?.order).toEqual(["note.race", "note.class", "note.level", "note.background"]);
    expect(cards?.title).toBe("note.title");
    expect(cards?.cardSize).toBe(260);
    // hasImages is false, so no cover image is set.
    expect(cards?.image).toBeUndefined();
  });

  it("adds the cover image only when the folder has images", () => {
    const cards = base({ hasImages: true }).views.find((v) => v.type === "cards");
    expect(cards?.image).toBe("note.image");
    expect(cards?.imageAspectRatio).toBe(1);
  });

  it("names shown columns (Bases shows raw ids otherwise) and carries overrides", () => {
    // Shown Identity keys get a friendly name; ability/combat overrides ride
    // along for columns the user might add. hit_dice → 'Hit Dice' == prettify.
    expect(base().properties).toEqual({
      "note.race": { displayName: "Race" },
      "note.class": { displayName: "Class" },
      "note.level": { displayName: "Level" },
      "note.background": { displayName: "Background" },
      "note.alignment": { displayName: "Alignment" },
      "note.player": { displayName: "Player" },
      "note.strength": { displayName: "STR" },
      "note.armor_class": { displayName: "AC" },
      "note.hit_points": { displayName: "HP" },
      "note.proficiency_bonus": { displayName: "Proficiency" },
      "note.spell_save_dc": { displayName: "Spell Save DC" },
    });
  });

  it("falls back to the seen keys (capped) and prettifies their names when template is null", () => {
    const many = Array.from({ length: 12 }, (_, i) => `k${i}`);
    const cfg = base({ template: null, templateId: null, fallbackKeys: many });
    const table = cfg.views.find((v) => v.type === "table");
    expect(table?.order).toEqual(["file.name", ...many.slice(0, 8).map((k) => `note.${k}`)]);
    // Shown columns (table's 8 ∪ cards' 4 = k0..k7) get prettified display names.
    expect(cfg.properties).toEqual(
      Object.fromEntries(
        many.slice(0, 8).map((k) => [`note.${k}`, { displayName: k.toUpperCase() }]),
      ),
    );
  });
});
