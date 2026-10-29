/**
 * Three ways to sum to n.
 *
 * Assumptions:
 * - `n` is an integer and the result fits within Number.MAX_SAFE_INTEGER (per the brief).
 * - sum_to_n(0) === 0.
 * - For negative n the sum runs from -1 down to n, i.e. sum_to_n(-3) === -1 + -2 + -3 === -6.
 *   This keeps the function odd-symmetric: sum_to_n(-n) === -sum_to_n(n).
 *
 * All three share one shape: check the input, sum 1..|n|, then apply the sign of n.
 */

/**
 * Largest |n| whose sum still fits in Number.MAX_SAFE_INTEGER:
 * 134,217,727 → 9,007,199,187,632,128 (MAX_SAFE_INTEGER is 9,007,199,254,740,991).
 */
export const MAX_N = 134_217_727;

/**
 * The brief guarantees a valid integer; checking anyway costs O(1) and turns anything
 * outside that contract into a clear error. Without it, 2.5 gave 4.375 from A but 3 from
 * B and C, Infinity made B loop forever, and NaN overflowed C's call stack.
 */
function assertValidN(n: number): void {
  if (!Number.isInteger(n) || Math.abs(n) > MAX_N) {
    throw new RangeError(
      `n must be an integer from -${MAX_N} to ${MAX_N}, got ${String(n)} (${typeof n})`,
    );
  }
}

/**
 * A) Closed-form arithmetic series (Gauss): n(n + 1) / 2.
 *
 * Time O(1), space O(1) — the most efficient option.
 * The intermediate n(n + 1) can exceed MAX_SAFE_INTEGER (up to ~2^54 for n = MAX_N), but
 * it is always even, so it is still exactly representable as a double and the division
 * by 2 is exact.
 */
export function sum_to_n_a(n: number): number {
  assertValidN(n);
  const m = Math.abs(n);
  const sum = (m * (m + 1)) / 2;
  return n < 0 ? -sum : sum;
}

/**
 * B) Iterative loop.
 *
 * Time O(n), space O(1). Simple and obviously correct, and never overflows the call stack,
 * but slow for very large n: ~120 ms for n = MAX_N (134M iterations) in Node 24.
 */
export function sum_to_n_b(n: number): number {
  assertValidN(n);
  const m = Math.abs(n);
  let sum = 0;
  for (let i = 1; i <= m; i++) {
    sum += i;
  }
  return n < 0 ? -sum : sum;
}

/**
 * C) Divide-and-conquer recursion: sum(lo..hi) = sum(lo..mid) + sum(mid+1..hi).
 *
 * Time O(n): every number is still visited once, plus a function call per range, so it
 * is the slowest of the three in practice (~1.2 s for n = MAX_N in Node 24, ~10x the
 * loop). Space O(log n) for the call stack. A naive `n + sum(n - 1)` recursion needs one
 * stack frame per number and overflows at about n = 9,300 in Node 24; halving the range
 * keeps the depth at ~log2(n), about 27 for n = MAX_N.
 */
export function sum_to_n_c(n: number): number {
  assertValidN(n);
  const sumRange = (lo: number, hi: number): number => {
    if (lo > hi) return 0;
    if (lo === hi) return lo;
    const mid = Math.floor((lo + hi) / 2);
    return sumRange(lo, mid) + sumRange(mid + 1, hi);
  };
  const sum = sumRange(1, Math.abs(n));
  return n < 0 ? -sum : sum;
}
