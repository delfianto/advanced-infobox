import { describe, expect, it } from "vitest";
import { isEditableValue, parseNumberInput } from "src/model/edit";
import { type FieldValue } from "src/model/values";

describe("isEditableValue", () => {
  it("allows scalar booleans and numbers (v1 scope)", () => {
    expect(isEditableValue({ kind: "boolean", value: true })).toBe(true);
    expect(isEditableValue({ kind: "boolean", value: false })).toBe(true);
    expect(isEditableValue({ kind: "number", value: 0 })).toBe(true);
    expect(isEditableValue({ kind: "number", value: -12.5 })).toBe(true);
  });

  it("rejects value kinds that don't round-trip cleanly yet", () => {
    const readonly: FieldValue[] = [
      { kind: "markdown", markdown: "Gandalf" },
      { kind: "date", iso: "2026-07-15" },
      { kind: "list", items: [{ kind: "number", value: 1 }] },
      { kind: "empty" },
    ];
    for (const value of readonly) expect(isEditableValue(value)).toBe(false);
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
