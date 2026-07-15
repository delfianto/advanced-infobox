import {
  coerceScalar,
  isDateOnly,
  isEditableValue,
  listItemText,
  parseNumberInput,
} from "src/model/edit";
import { describe, expect, it } from "vitest";
import { type FieldValue } from "src/model/values";

describe("isEditableValue", () => {
  it("allows scalar booleans, numbers, strings and date-only values", () => {
    expect(isEditableValue({ kind: "boolean", value: true })).toBe(true);
    expect(isEditableValue({ kind: "number", value: -12.5 })).toBe(true);
    expect(isEditableValue({ kind: "markdown", markdown: "Gandalf" })).toBe(true);
    expect(isEditableValue({ kind: "date", iso: "2026-07-15" })).toBe(true);
  });

  it("allows a list whose items are all scalars", () => {
    expect(
      isEditableValue({
        kind: "list",
        items: [
          { kind: "markdown", markdown: "Strider" },
          { kind: "number", value: 3 },
        ],
      }),
    ).toBe(true);
  });

  it("leaves datetime, nested lists and empty read-only", () => {
    const readonly: FieldValue[] = [
      { kind: "date", iso: "2026-07-15T09:30" },
      { kind: "list", items: [{ kind: "list", items: [{ kind: "number", value: 1 }] }] },
      { kind: "empty" },
    ];
    for (const value of readonly) expect(isEditableValue(value)).toBe(false);
  });
});

describe("isDateOnly", () => {
  it("matches YYYY-MM-DD only", () => {
    expect(isDateOnly("2026-07-15")).toBe(true);
    expect(isDateOnly("1879-03-14")).toBe(true);
  });

  it("rejects datetime and malformed values", () => {
    expect(isDateOnly("2026-07-15T09:30")).toBe(false);
    expect(isDateOnly("2026-07-15 09:30")).toBe(false);
    expect(isDateOnly("2026-7-5")).toBe(false);
    expect(isDateOnly("not a date")).toBe(false);
  });
});

describe("listItemText", () => {
  it("renders each scalar item as its editable text", () => {
    expect(listItemText({ kind: "number", value: 5 })).toBe("5");
    expect(listItemText({ kind: "boolean", value: false })).toBe("false");
    expect(listItemText({ kind: "markdown", markdown: "Strider" })).toBe("Strider");
    expect(listItemText({ kind: "date", iso: "2026-01-02" })).toBe("2026-01-02");
  });
});

describe("coerceScalar", () => {
  it("types booleans and canonical numbers, keeps everything else as text", () => {
    expect(coerceScalar("true")).toBe(true);
    expect(coerceScalar("false")).toBe(false);
    expect(coerceScalar("42")).toBe(42);
    expect(coerceScalar("-3.5")).toBe(-3.5);
    expect(coerceScalar("Strider")).toBe("Strider");
    expect(coerceScalar("  spaced  ")).toBe("spaced");
  });

  it("keeps non-canonical number-ish strings as text (no data surprises)", () => {
    expect(coerceScalar("007")).toBe("007");
    expect(coerceScalar("1e3")).toBe("1e3");
    expect(coerceScalar("3px")).toBe("3px");
  });

  it("returns null for empty/whitespace so the row is dropped", () => {
    expect(coerceScalar("")).toBeNull();
    expect(coerceScalar("   ")).toBeNull();
  });
});

describe("parseNumberInput", () => {
  it("parses integers, decimals, negatives and scientific notation", () => {
    expect(parseNumberInput("42")).toBe(42);
    expect(parseNumberInput("3.14")).toBe(3.14);
    expect(parseNumberInput("-5")).toBe(-5);
    expect(parseNumberInput("  10  ")).toBe(10);
    expect(parseNumberInput("1e3")).toBe(1000);
    expect(parseNumberInput("0")).toBe(0);
  });

  it("rejects empty, whitespace and non-finite input", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("   ")).toBeNull();
    expect(parseNumberInput("abc")).toBeNull();
    expect(parseNumberInput("12px")).toBeNull();
    expect(parseNumberInput("Infinity")).toBeNull();
    expect(parseNumberInput("NaN")).toBeNull();
  });
});
