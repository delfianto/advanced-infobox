import { describe, expect, it } from "vitest";
import { hasInfoboxAnchor, isAutoEmbedTrigger, qualifiesForAutoEmbed } from "src/model/auto-embed";
import { DEFAULT_SETTINGS } from "src/settings/settings";

describe("isAutoEmbedTrigger", () => {
  it("treats a template id (non-empty string) as a yes", () => {
    expect(isAutoEmbedTrigger("person")).toBe(true);
    expect(isAutoEmbedTrigger("  dnd  ")).toBe(true);
    expect(isAutoEmbedTrigger("true")).toBe(true);
    expect(isAutoEmbedTrigger("yes")).toBe(true);
  });

  it("treats boolean true and non-zero numbers as a yes", () => {
    expect(isAutoEmbedTrigger(true)).toBe(true);
    expect(isAutoEmbedTrigger(1)).toBe(true);
    expect(isAutoEmbedTrigger(42)).toBe(true);
  });

  it("treats explicit falsy values as a no (per-note opt-out)", () => {
    expect(isAutoEmbedTrigger(false)).toBe(false);
    expect(isAutoEmbedTrigger("false")).toBe(false);
    expect(isAutoEmbedTrigger("no")).toBe(false);
    expect(isAutoEmbedTrigger("off")).toBe(false);
    expect(isAutoEmbedTrigger("0")).toBe(false);
    expect(isAutoEmbedTrigger("No")).toBe(false);
    expect(isAutoEmbedTrigger(0)).toBe(false);
  });

  it("treats absent/empty/non-scalar values as a no", () => {
    expect(isAutoEmbedTrigger(undefined)).toBe(false);
    expect(isAutoEmbedTrigger(null)).toBe(false);
    expect(isAutoEmbedTrigger("")).toBe(false);
    expect(isAutoEmbedTrigger("   ")).toBe(false);
    expect(isAutoEmbedTrigger([])).toBe(false);
    expect(isAutoEmbedTrigger(["person"])).toBe(false);
    expect(isAutoEmbedTrigger({})).toBe(false);
  });
});

describe("qualifiesForAutoEmbed", () => {
  const on = { ...DEFAULT_SETTINGS, autoEmbed: true };

  it("never qualifies when the feature is off", () => {
    expect(qualifiesForAutoEmbed({ infobox: "person" }, DEFAULT_SETTINGS)).toBe(false);
  });

  it("qualifies a note whose template property is truthy", () => {
    expect(qualifiesForAutoEmbed({ infobox: "person" }, on)).toBe(true);
    expect(qualifiesForAutoEmbed({ infobox: true }, on)).toBe(true);
  });

  it("does not qualify without the trigger property or with a falsy one", () => {
    expect(qualifiesForAutoEmbed({ title: "Gandalf" }, on)).toBe(false);
    expect(qualifiesForAutoEmbed({ infobox: false }, on)).toBe(false);
    expect(qualifiesForAutoEmbed(undefined, on)).toBe(false);
    expect(qualifiesForAutoEmbed({}, on)).toBe(false);
  });

  it("honors a renamed template property", () => {
    const renamed = { ...on, templateKey: "cover" };
    expect(qualifiesForAutoEmbed({ cover: "place" }, renamed)).toBe(true);
    expect(qualifiesForAutoEmbed({ infobox: "place" }, renamed)).toBe(false);
  });
});

describe("hasInfoboxAnchor", () => {
  it("detects a plain fenced infobox block", () => {
    expect(hasInfoboxAnchor("# Title\n\n```infobox\n```\n")).toBe(true);
  });

  it("detects tildes, longer fences, indentation, trailing options and case", () => {
    expect(hasInfoboxAnchor("~~~infobox\n~~~")).toBe(true);
    expect(hasInfoboxAnchor("````infobox\n````")).toBe(true);
    expect(hasInfoboxAnchor("   ```infobox")).toBe(true);
    expect(hasInfoboxAnchor("```infobox placement: left")).toBe(true);
    expect(hasInfoboxAnchor("```INFOBOX")).toBe(true);
  });

  it("does not match prose or lookalike languages", () => {
    expect(hasInfoboxAnchor("This note has an infobox in it.")).toBe(false);
    expect(hasInfoboxAnchor("```infoboxes\n```")).toBe(false);
    expect(hasInfoboxAnchor("```info\n```")).toBe(false);
    expect(hasInfoboxAnchor("just `infobox` inline code")).toBe(false);
  });
});
