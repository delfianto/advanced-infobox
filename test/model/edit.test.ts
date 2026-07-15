import { describe, expect, it } from "vitest";
import { isDateOnly, isEditableValue, parseNumberInput } from "src/model/edit";
import { type FieldValue } from "src/model/values";

describe("isEditableValue", () => {
  it("allows scalar booleans, numbers, strings and date-only values", () => {
    expect(isEditableValue({ kind: "boolean", value: true })).toBe(true);
    expect(isEditableValue({ kind: "number", value: -12.5 })).toBe(true);
    expect(isEditableValue({ kind: "markdown", markdown: "Gandalf" })).toBe(true);
    expect(isEditableValue({ kind: "date", iso: "2026-07-15" })).toBe(true);
  });

  it("leaves datetime, lists and empty read-only", () => {
    const readonly: FieldValue[] = [
      { kind: "date", iso: "2026-07-15T09:30" },
      { kind: "list", items: [{ kind: "number", value: 1 }] },
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
