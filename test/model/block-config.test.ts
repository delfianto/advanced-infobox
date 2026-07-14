import { describe, expect, it } from "vitest";
import { parseBlockConfig } from "src/model/block-config";

describe("parseBlockConfig", () => {
  it("returns an empty config for an empty block", () => {
    expect(parseBlockConfig("")).toEqual({ config: {}, errors: [] });
    expect(parseBlockConfig("  \n \n")).toEqual({ config: {}, errors: [] });
  });

  it("parses valid options", () => {
    const { config, errors } = parseBlockConfig(
      [
        "placement: left",
        "exclude: [draft, status]",
        "image: cover.png",
        "caption: A caption",
      ].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(config).toEqual({
      placement: "left",
      exclude: ["draft", "status"],
      image: "cover.png",
      caption: "A caption",
    });
  });

  it("accepts comma-separated exclude strings", () => {
    const { config, errors } = parseBlockConfig("exclude: draft, status");
    expect(errors).toEqual([]);
    expect(config.exclude).toEqual(["draft", "status"]);
  });

  it("reports unparseable YAML without throwing", () => {
    const { config, errors } = parseBlockConfig("placement: [unclosed");
    expect(config).toEqual({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Could not parse infobox options");
  });

  it("rejects non-mapping content", () => {
    const { errors } = parseBlockConfig("- just\n- a\n- list");
    expect(errors[0]).toContain("must be `key: value` lines");
  });

  it("flags unknown keys but keeps valid ones", () => {
    const { config, errors } = parseBlockConfig("placement: right\ntitle: Nope");
    expect(config.placement).toBe("right");
    expect(errors.some((e) => e.includes("Unknown option `title`"))).toBe(true);
  });

  it("rejects invalid placement values and leaves placement unset", () => {
    const { config, errors } = parseBlockConfig("placement: center");
    expect(config.placement).toBeUndefined();
    expect(errors.some((e) => e.includes("Invalid placement"))).toBe(true);
  });

  it("rejects non-string image/caption/template", () => {
    const { config, errors } = parseBlockConfig("image: 42");
    expect(config.image).toBeUndefined();
    expect(errors.some((e) => e.includes("Invalid `image`"))).toBe(true);
  });

  it("parses template for the template phase", () => {
    const { config, errors } = parseBlockConfig("template: person");
    expect(errors).toEqual([]);
    expect(config.template).toBe("person");
  });

  describe("sections", () => {
    it("parses the mapping form with list and comma values", () => {
      const { config, errors } = parseBlockConfig(
        ["sections:", "  Identity: [race, class]", "  Combat: armor_class, hit_points"].join("\n"),
      );
      expect(errors).toEqual([]);
      expect(config.sections).toEqual([
        { label: "Identity", keys: ["race", "class"] },
        { label: "Combat", keys: ["armor_class", "hit_points"] },
      ]);
    });

    it("parses the explicit list form", () => {
      const { config, errors } = parseBlockConfig(
        ["sections:", "  - Identity: [race, class]", "  - Combat: [armor_class]"].join("\n"),
      );
      expect(errors).toEqual([]);
      expect(config.sections).toEqual([
        { label: "Identity", keys: ["race", "class"] },
        { label: "Combat", keys: ["armor_class"] },
      ]);
    });

    it("flags sections without keys and keeps valid ones", () => {
      const { config, errors } = parseBlockConfig(
        ["sections:", "  Empty:", "  Identity: [race]"].join("\n"),
      );
      expect(config.sections).toEqual([{ label: "Identity", keys: ["race"] }]);
      expect(errors.some((e) => e.includes("Section `Empty` needs a list"))).toBe(true);
    });

    it("rejects scalar sections values", () => {
      const { config, errors } = parseBlockConfig("sections: nope");
      expect(config.sections).toBeUndefined();
      expect(errors.some((e) => e.includes("Invalid `sections`"))).toBe(true);
    });

    it("flags malformed list entries", () => {
      const { config, errors } = parseBlockConfig(["sections:", "  - just a string"].join("\n"));
      expect(config.sections).toBeUndefined();
      expect(errors.some((e) => e.includes("Each section must be"))).toBe(true);
    });
  });

  describe("unlisted", () => {
    it("accepts show and hide", () => {
      expect(parseBlockConfig("unlisted: hide").config.unlisted).toBe("hide");
      expect(parseBlockConfig("unlisted: show").config.unlisted).toBe("show");
    });

    it("rejects other values", () => {
      const { config, errors } = parseBlockConfig("unlisted: maybe");
      expect(config.unlisted).toBeUndefined();
      expect(errors.some((e) => e.includes("Invalid `unlisted`"))).toBe(true);
    });
  });
});
