import { withoutFloatNoise } from "./amount";

// Intl.NumberFormat is relatively expensive to construct, so each formatter is built once.
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
// Token amounts are truncated, never rounded up: a balance of 1.65316 must not show as
// "1.6532", or typing the balance you can see would be "more than you have".
const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
  roundingMode: "trunc",
});
const smallAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 4,
  roundingMode: "trunc",
});
const smallPriceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 4,
});

/** A USD value (an estimate, so it rounds to the nearest cent). */
export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return "< $0.01";
  return usdFormatter.format(value);
}

/**
 * A token amount for display: grouped thousands above 1, significant digits below 1 so
 * tiny values stay readable (0.0000001553 rather than "0"). Truncated, so the shown
 * amount is never more than the real one.
 */
export function formatAmount(value: number): string {
  if (value === 0) return "0";
  const clean = withoutFloatNoise(value);
  return (Math.abs(clean) >= 1 ? amountFormatter : smallAmountFormatter).format(
    clean,
  );
}

/** Unit price: cents above $1, significant digits below so cheap tokens stay readable. */
export function formatPrice(value: number): string {
  return (value >= 1 ? usdFormatter : smallPriceFormatter).format(value);
}
