import { describe, expect, it } from "vitest";
import { centsToDecimalInput, decimalInputToCents, formatBRL, isDecimalMoneyInput, parseBRLToCents, percentToBps } from "./money";

describe("money utils", () => {
  it("formats cents as BRL", () => {
    expect(formatBRL(12345)).toContain("123,45");
  });

  it("parses BRL text to cents", () => {
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
  });

  it("parses decimal input to cents without floating point drift", () => {
    expect(decimalInputToCents("10229.98")).toBe(1022998);
    expect(decimalInputToCents("1.2")).toBe(120);
    expect(centsToDecimalInput(120)).toBe("1.20");
  });

  it("rejects malformed money inputs", () => {
    expect(isDecimalMoneyInput("1.22.33")).toBe(false);
    expect(isDecimalMoneyInput("1,22,33")).toBe(false);
    expect(isDecimalMoneyInput("-1")).toBe(false);
  });

  it("converts percent to basis points", () => {
    expect(percentToBps("14,5")).toBe(1450);
  });
});
