import { formatAmount } from "../../../shared/lib/format";
import type { SwapReceipt } from "../api";

/** One-line summary of a completed swap, e.g. for a confirmation toast. */
export function describeSwapReceipt(receipt: SwapReceipt): string {
  return `Swapped ${formatAmount(receipt.fromAmount)} ${receipt.fromSymbol} for ${formatAmount(receipt.toAmount)} ${receipt.toSymbol} · tx ${receipt.txHash}`;
}
