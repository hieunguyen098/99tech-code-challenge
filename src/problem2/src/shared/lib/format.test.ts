import { describe, expect, it } from "vitest";
import { withoutFloatNoise } from "./amount";
import { formatAmount, formatUsd } from "./format";

describe("formatAmount", () => {
  it("keeps tiny values readable instead of hiding them", () => {
    expect(formatAmount(0.000000155336)).toBe("0.0000001553");
  });

  it("groups thousands and limits decimals for larger values", () => {
    expect(formatAmount(1234.56789)).toBe("1,234.5678");
    expect(formatAmount(0)).toBe("0");
  });
});

describe("formatUsd", () => {
  it("formats dollars and flags sub-cent values", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(0.004)).toBe("< $0.01");
  });
});

describe("formatAmount never shows more than the real amount", () => {
  it.each([
    // Real mock balances from the live feed that used to be shown rounded up.
    [1.65316, "1.6531"],
    [0.0905671, "0.09056"],
    [1.97355, "1.9735"],
  ])("%d shows as %s", (value, shown) => {
    expect(formatAmount(value)).toBe(shown);
  });

  it("ignores float noise instead of truncating it into a lost unit", () => {
    expect(formatAmount(4.35 * 100)).toBe("435"); // 434.99999999999994
  });

  it("never shows a value above the real one, across many values", () => {
    for (let k = 1; k < 5000; k++) {
      const value = (k * 7919) / 1e5 + k / 3;
      const shown = Number(formatAmount(value).replace(/,/g, ""));
      // Compare with the noise-free value: e.g. 86.6299 is computed as 86.62989999999999,
      // and that ~1e-14 float error is not an amount the user owns.
      expect(shown).toBeLessThanOrEqual(withoutFloatNoise(value));
    }
  });
});
