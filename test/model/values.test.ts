import { describe, expect, it } from "vitest";
import { asDisplayString, classifyValue, normalizeTags, prettifyKey } from "src/model/values";

describe("prettifyKey", () => {
  it("converts snake_case", () => {
    expect(prettifyKey("eye_color")).toBe("Eye Color");
  });

  it("converts kebab-case", () => {
    expect(prettifyKey("known-for")).toBe("Known For");
  });

  it("converts camelCase", () => {
    expect(prettifyKey("knownFor")).toBe("Known For");
  });

  it("capitalizes single words", () => {
    expect(prettifyKey("born")).toBe("Born");
  });

  it("keeps digits attached to their word", () => {
    expect(prettifyKey("top_10_hits")).toBe("Top 10 Hits");
  });

  it("returns the key unchanged when it has no word characters", () => {
    expect(prettifyKey("__")).toBe("__");
  });
});

describe("classifyValue", () => {
  it("treats strings as markdown", () => {
    expect(classifyValue("[[Theoretical physics]]")).toEqual({
      kind: "markdown",
      markdown: "[[Theoretical physics]]",
    });
  });

  it("trims strings and empties blank ones", () => {
    expect(classifyValue("   ")).toEqual({ kind: "empty" });
    expect(classifyValue(" x ")).toEqual({ kind: "markdown", markdown: "x" });
  });

  it("passes numbers and booleans through", () => {
    expect(classifyValue(42)).toEqual({ kind: "number", value: 42 });
    expect(classifyValue(false)).toEqual({ kind: "boolean", value: false });
  });

  it("maps null and undefined to empty", () => {
    expect(classifyValue(null)).toEqual({ kind: "empty" });
    expect(classifyValue(undefined)).toEqual({ kind: "empty" });
  });

  it("classifies arrays recursively, dropping empty items", () => {
    expect(classifyValue(["a", null, "b"])).toEqual({
      kind: "list",
      items: [
        { kind: "markdown", markdown: "a" },
        { kind: "markdown", markdown: "b" },
      ],
    });
  });

  it("collapses arrays with no renderable items to empty", () => {
    expect(classifyValue([null, ""])).toEqual({ kind: "empty" });
  });

  it("detects ISO date strings", () => {
    expect(classifyValue("1879-03-14")).toEqual({ kind: "date", iso: "1879-03-14" });
    expect(classifyValue("2024-01-01T10:30")).toEqual({ kind: "date", iso: "2024-01-01T10:30" });
  });

  it("does not mistake date-adjacent strings for dates", () => {
    expect(classifyValue("25 ft.")).toEqual({ kind: "markdown", markdown: "25 ft." });
    expect(classifyValue("1879-03")).toEqual({ kind: "markdown", markdown: "1879-03" });
    expect(classifyValue("born 1879-03-14")).toEqual({
      kind: "markdown",
      markdown: "born 1879-03-14",
    });
  });

  it("converts Date instances to date values", () => {
    expect(classifyValue(new Date("1879-03-14T00:00:00Z"))).toEqual({
      kind: "date",
      iso: "1879-03-14",
    });
  });

  it("renders nested objects as inline code instead of guessing", () => {
    expect(classifyValue({ a: 1 })).toEqual({
      kind: "markdown",
      markdown: '`{"a":1}`',
    });
  });
});

describe("normalizeTags", () => {
  it("handles arrays", () => {
    expect(normalizeTags(["science", "physics"])).toEqual(["science", "physics"]);
  });

  it("handles comma and space separated strings", () => {
    expect(normalizeTags("science, physics history")).toEqual(["science", "physics", "history"]);
  });

  it("strips leading hashes and dedupes case-insensitively", () => {
    expect(normalizeTags(["#Science", "science"])).toEqual(["Science"]);
  });

  it("returns empty for null/undefined", () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
  });
});

describe("asDisplayString", () => {
  it("returns trimmed strings", () => {
    expect(asDisplayString(" Albert ")).toBe("Albert");
  });

  it("returns undefined for blank strings", () => {
    expect(asDisplayString("  ")).toBeUndefined();
  });

  it("stringifies numbers and booleans", () => {
    expect(asDisplayString(7)).toBe("7");
    expect(asDisplayString(true)).toBe("true");
  });

  it("takes the first element of arrays", () => {
    expect(asDisplayString(["a", "b"])).toBe("a");
    expect(asDisplayString([])).toBeUndefined();
  });

  it("returns undefined for objects", () => {
    expect(asDisplayString({ nested: true })).toBeUndefined();
  });
});
