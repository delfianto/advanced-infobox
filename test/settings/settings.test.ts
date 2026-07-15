import { describe, expect, it } from "vitest";
import { parseLabelMap, serializeLabelMap } from "src/settings/settings";

describe("parseLabelMap", () => {
  it("parses one key: Label pair per line", () => {
    expect(parseLabelMap("hp: Hit Points\narmor_class: AC")).toEqual({
      hp: "Hit Points",
      armor_class: "AC",
    });
  });

  it("keeps colons inside labels", () => {
    expect(parseLabelMap("ratio: Ratio (w:h)")).toEqual({ ratio: "Ratio (w:h)" });
  });

  it("ignores malformed lines", () => {
    expect(parseLabelMap("no colon here\n: no key\nkey:\n\nok: Fine")).toEqual({ ok: "Fine" });
  });

  it("round-trips through serializeLabelMap", () => {
    const map = { hp: "Hit Points", armor_class: "AC" };
    expect(parseLabelMap(serializeLabelMap(map))).toEqual(map);
  });
});
