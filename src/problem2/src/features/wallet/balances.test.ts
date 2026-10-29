import { describe, expect, it } from "vitest";
import {
  formatForInput,
  parseAmount,
  roundAmount,
} from "../../shared/lib/amount";
import type { Token } from "../tokens";
import {
  applyBalanceChanges,
  withMockBalancesFor,
  type Balances,
} from "./balances";

describe("applyBalanceChanges", () => {
  it("applies credits and debits and leaves other tokens alone", () => {
    const balances: Balances = { ETH: 1.6532, USDC: 500, ATOM: 3 };
    expect(
      applyBalanceChanges(balances, [
        { symbol: "USDC", delta: -150 },
        { symbol: "ETH", delta: 0.09064222 },
      ]),
    ).toEqual({ ETH: 1.74384222, USDC: 350, ATOM: 3 });
  });

  it("creates a balance for a token the wallet didn't hold yet", () => {
    expect(applyBalanceChanges({}, [{ symbol: "WBTC", delta: 0.5 }])).toEqual({
      WBTC: 0.5,
    });
  });

  it("keeps balances at input precision so MAX never exceeds the balance", () => {
    // Regression: 1.6532 + 0.09064222 is 1.7438422199999999 in floating point, which MAX
    // used to round up to 1.74384222, above the real balance.
    for (let k = 1; k < 2000; k++) {
      const { ETH = 0 } = applyBalanceChanges({ ETH: 1.6532 }, [
        { symbol: "ETH", delta: roundAmount(k * 0.0123456789) },
      ]);
      expect(parseAmount(formatForInput(ETH))).toBeLessThanOrEqual(ETH);
    }
  });

  it("never goes below zero", () => {
    expect(
      applyBalanceChanges({ USDC: 1 }, [{ symbol: "USDC", delta: -2 }]),
    ).toEqual({ USDC: 0 });
  });
});

describe("withMockBalancesFor", () => {
  const token = (symbol: string, price: number): Token => ({
    symbol,
    price,
    updatedAt: "",
    iconUrl: "",
  });

  it("gives new tokens a balance and leaves existing ones untouched", () => {
    const next = withMockBalancesFor({ USDC: 12 }, [
      token("USDC", 1),
      token("ETH", 2000),
    ]);
    expect(next.USDC).toBe(12);
    expect(next.ETH).toBeGreaterThan(0);
  });

  it("returns the same object when no token is new, so React skips the update", () => {
    const balances: Balances = { USDC: 12 };
    expect(withMockBalancesFor(balances, [token("USDC", 1)])).toBe(balances);
  });
});
