import { describe, expect, it } from "vitest";
import type { Token } from "../../tokens";
import { validateSwap } from "./validation";

const token = (symbol: string, price: number): Token => ({
  symbol,
  price,
  updatedAt: "",
  iconUrl: "",
});
const USDC = token("USDC", 1);
const ETH = token("ETH", 2000);

describe("validateSwap", () => {
  const valid = {
    fromToken: USDC,
    toToken: ETH,
    fromAmount: 10,
    toAmount: 0.005,
    balance: 100,
  };

  it("passes a valid swap", () => {
    expect(validateSwap(valid)).toBeNull();
  });

  it.each([
    [{ toToken: null }, { kind: "select-token" }],
    [{ toToken: USDC }, { kind: "same-token" }],
    [{ fromAmount: 0, toAmount: 0 }, { kind: "enter-amount" }],
    [{ toAmount: 0 }, { kind: "amount-too-small" }],
    [{ fromAmount: 101 }, { kind: "insufficient-balance", symbol: "USDC" }],
  ] as const)("flags %o as %o", (override, issue) => {
    expect(validateSwap({ ...valid, ...override })).toEqual(issue);
  });
});
