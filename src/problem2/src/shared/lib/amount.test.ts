import { describe, expect, it } from "vitest";
import {
  formatForInput,
  MAX_SIGNIFICANT_DIGITS,
  MAX_WHOLE_DIGITS,
  parseAmount,
  roundAmount,
  sanitizeAmountInput,
} from "./amount";

describe("sanitizeAmountInput", () => {
  it.each([
    ["", ""],
    ["12", "12"],
    ["1,5", "1.5"],
    [".5", "0.5"],
    ["007", "7"],
    ["0.0", "0.0"],
    ["1 000", "1000"],
  ])("accepts %j as %j", (input, expected) => {
    expect(sanitizeAmountInput(input)).toBe(expected);
  });

  it.each(["abc", "1.2.3", "-1", "1e5", "0.123456789"])(
    "rejects %j",
    (input) => {
      expect(sanitizeAmountInput(input)).toBeNull();
    },
  );
});

describe("parseAmount", () => {
  it("parses decimals and treats anything else as zero", () => {
    expect(parseAmount("1.5")).toBe(1.5);
    expect(parseAmount("")).toBe(0);
  });
});

describe("formatForInput / roundAmount", () => {
  it("formats computed amounts for an input field", () => {
    expect(formatForInput(2)).toBe("2");
    expect(formatForInput(1 / 3)).toBe("0.33333333");
    expect(formatForInput(0)).toBe("");
  });

  it("never uses exponent notation, even for huge values", () => {
    expect(formatForInput(2e22)).toBe("20000000000000000000000");
  });

  it("removes floating point noise beyond input precision", () => {
    expect(roundAmount(1.6532 + 0.09064222)).toBe(1.74384222);
  });
});

describe("whole-digit limit", () => {
  it(`accepts up to ${MAX_WHOLE_DIGITS} whole digits and rejects more`, () => {
    const max = "9".repeat(MAX_WHOLE_DIGITS);
    expect(sanitizeAmountInput(`${max}.5`)).toBe(`${max}.5`);
    expect(sanitizeAmountInput(`${max}9`)).toBeNull();
  });

  it("counts digits after removing leading zeros", () => {
    expect(sanitizeAmountInput(`000${"9".repeat(MAX_WHOLE_DIGITS)}`)).toBe(
      "9".repeat(MAX_WHOLE_DIGITS),
    );
  });
});

describe("significant-digit limit", () => {
  it(`accepts up to ${MAX_SIGNIFICANT_DIGITS} significant digits and rejects more`, () => {
    expect(sanitizeAmountInput("1234567.12345678")).toBe("1234567.12345678");
    expect(sanitizeAmountInput("999999999999.999")).toBe("999999999999.999");
    expect(sanitizeAmountInput("123456789.12345678")).toBeNull();
    expect(sanitizeAmountInput("999999999999.9999")).toBeNull();
  });

  it("doesn't count leading or trailing zeros", () => {
    expect(sanitizeAmountInput("100000000000")).toBe("100000000000");
    expect(sanitizeAmountInput("0.00000001")).toBe("0.00000001");
    expect(sanitizeAmountInput("1234567.10000000")).toBe("1234567.10000000");
  });

  it("submits exactly what was typed", () => {
    // Regression: "999999999999.99999999" used to be accepted and become 1000000000000.
    for (const typed of [
      "1234567.12345678",
      "999999999999.999",
      "0.00000001",
    ]) {
      expect(formatForInput(parseAmount(typed))).toBe(typed);
    }
  });
});

describe("formatForInput rounding direction", () => {
  const exact = 0.0016645059112990264; // 2.74 USDC in ETH at the live price

  it("rounds down, up or to nearest at 8 decimals", () => {
    expect(formatForInput(exact, "down")).toBe("0.0016645");
    expect(formatForInput(exact, "up")).toBe("0.00166451");
    expect(formatForInput(exact, "nearest")).toBe("0.00166451");
  });

  it("strips float noise first, so it never becomes a whole unit", () => {
    expect(formatForInput(0.1 + 0.2, "up")).toBe("0.3"); // not 0.30000001
    expect(formatForInput(4.35 * 100, "down")).toBe("435"); // not 434.99999999
    expect(formatForInput(1.6532 + 0.09064222, "down")).toBe("1.74384222");
  });
});
