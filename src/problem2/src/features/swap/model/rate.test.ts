import { describe, expect, it } from "vitest";
import type { Token } from "../../tokens";
import { describeRate } from "./rate";

const token = (symbol: string, price: number): Token => ({
  symbol,
  price,
  updatedAt: "",
  iconUrl: "",
});
const ETH = token("ETH", 2000);
const USDC = token("USDC", 1);

describe("describeRate", () => {
  it("states the value of one base token by default", () => {
    expect(describeRate(ETH, USDC)).toBe("1 ETH = 2,000 USDC");
  });

  it("keeps the shown amount and the converted amount in step", () => {
    expect(describeRate(ETH, USDC, 2)).toBe("2 ETH = 4,000 USDC");
    expect(describeRate(token("SWTH", 0.004), USDC, 1000)).toBe(
      "1,000 SWTH = 4 USDC",
    );
  });

  it("keeps tiny rates readable", () => {
    expect(describeRate(token("SWTH", 0.004), token("WBTC", 25000))).toBe(
      "1 SWTH = 0.00000016 WBTC",
    );
  });
});
