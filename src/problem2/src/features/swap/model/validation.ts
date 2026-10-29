import type { Token } from "../../tokens";

export type SwapIssue =
  | { kind: "select-token" }
  | { kind: "same-token" }
  | { kind: "enter-amount" }
  | { kind: "amount-too-small" }
  | { kind: "insufficient-balance"; symbol: string };

export interface SwapValidationInput {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: number;
  toAmount: number;
  balance: number;
}

/** Returns the first thing stopping the swap, or `null` if it can go ahead. */
export function validateSwap({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  balance,
}: SwapValidationInput): SwapIssue | null {
  if (!fromToken || !toToken) return { kind: "select-token" };
  if (fromToken.symbol === toToken.symbol) return { kind: "same-token" };
  if (!(fromAmount > 0) && !(toAmount > 0)) return { kind: "enter-amount" };
  // One side rounds to 0 at 8 decimals, e.g. 0.001 SWTH -> WBTC: the user would pay for nothing.
  if (!(fromAmount > 0) || !(toAmount > 0)) return { kind: "amount-too-small" };
  if (fromAmount > balance) {
    return { kind: "insufficient-balance", symbol: fromToken.symbol };
  }
  return null;
}
