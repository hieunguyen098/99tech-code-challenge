import { formatAmount } from "../../../shared/lib/format";
import { convertAmount, type Token } from "../../tokens";

/**
 * The rate as a sentence: "1 SWTH = 0.0000001554 WBTC". The shown amount and the
 * converted amount come from the same `baseAmount`, so they can never disagree
 * (e.g. pass 1000 to quote tiny rates per 1,000 tokens).
 */
export function describeRate(
  base: Token,
  quote: Token,
  baseAmount = 1,
): string {
  return `${formatAmount(baseAmount)} ${base.symbol} = ${formatAmount(convertAmount(baseAmount, base, quote))} ${quote.symbol}`;
}
