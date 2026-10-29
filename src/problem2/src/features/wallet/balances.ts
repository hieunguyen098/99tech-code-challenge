import { roundAmount } from "../../shared/lib/amount";
import type { Token } from "../tokens";

export type Balances = Record<string, number>;

/** A credit (positive `delta`) or debit (negative `delta`) for one token. */
export interface BalanceChange {
  symbol: string;
  delta: number;
}

function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Mock wallet: gives every token a deterministic balance worth $250–$5,000 so the
 * demo is explorable and "insufficient balance" can still be triggered.
 */
export function createMockBalances(tokens: Token[]): Balances {
  const balances: Balances = {};
  for (const token of tokens) {
    const usdValue = 250 + (hash(token.symbol) % 4751);
    balances[token.symbol] = roundAmount(
      Number((usdValue / token.price).toPrecision(6)),
    );
  }
  return balances;
}

/**
 * Adds mock balances for tokens the wallet hasn't seen yet (e.g. new in a price refresh),
 * leaving existing balances untouched. Returns the same object when nothing is missing.
 */
export function withMockBalancesFor(
  balances: Balances,
  tokens: Token[],
): Balances {
  const missing = tokens.filter((token) => !(token.symbol in balances));
  return missing.length === 0
    ? balances
    : { ...createMockBalances(missing), ...balances };
}

/**
 * Applies credits and debits, keeping balances at input precision and never below zero.
 * Generic on purpose: swaps, sends or deposits all describe themselves as balance changes,
 * so the wallet doesn't depend on any feature that uses it.
 */
export function applyBalanceChanges(
  balances: Balances,
  changes: BalanceChange[],
): Balances {
  const next = { ...balances };
  for (const { symbol, delta } of changes) {
    next[symbol] = Math.max(0, roundAmount((next[symbol] ?? 0) + delta));
  }
  return next;
}
