# Problem 4: Three ways to sum to n

Solution: [`sum_to_n.ts`](./sum_to_n.ts) · Tests: [`sum_to_n.test.ts`](./sum_to_n.test.ts)

| Implementation | Approach                     | Time | Space    | Measured at `n = MAX_N`\* |
| -------------- | ---------------------------- | ---- | -------- | ------------------------- |
| `sum_to_n_a`   | Gauss formula `n(n+1)/2`     | O(1) | O(1)     | ~0 ms                     |
| `sum_to_n_b`   | Iterative loop               | O(n) | O(1)     | ~120 ms                   |
| `sum_to_n_c`   | Divide-and-conquer recursion | O(n) | O(log n) | ~1.2 s                    |

\*Node 24, `MAX_N = 134,217,727` (the largest valid input, see below).

- **A — formula.** The best choice. The intermediate `n(n+1)` can pass `MAX_SAFE_INTEGER`, but it is always even and below 2^54, so it is still exact as a double and the division by 2 is exact.
- **B — loop.** Simple, obviously correct and stack-safe, but it does `n` additions: 134 million at the limit.
- **C — recursion.** Splits the range in half (`sum(lo..mid) + sum(mid+1..hi)`), so the call stack is only ~log₂ n deep (about 27 at the limit). A naive `n + sum(n - 1)` needs one stack frame per number and overflows at about n = 9,300 in Node 24. It still visits every number and adds a function call per range, so it is the slowest in practice: ~10x the loop.

All three share one shape: check the input, sum `1..|n|`, then apply the sign of `n`.

## Assumptions

- `n` is an integer and the result is below `Number.MAX_SAFE_INTEGER` (as stated in the brief), so the largest valid `|n|` is `MAX_N = 134,217,727`.
- `sum_to_n(0) === 0`.
- **Negative `n`**: the brief says "any integer", so I sum from -1 down to `n`, e.g. `sum_to_n(-3) === -1 + -2 + -3 === -6`. This keeps `sum_to_n(-n) === -sum_to_n(n)`. (Other readings exist, such as returning 0 for `n ≤ 0`; this one is documented and tested.)

## Input validation

The brief promises valid input, but each function still checks it (an O(1) cost that doesn't change any complexity) and throws a `RangeError` for anything else. Without the check, inputs outside the contract went wrong in three different ways:

| Input      | A         | B                 | C                   |
| ---------- | --------- | ----------------- | ------------------- |
| `2.5`      | 4.375     | 3                 | 3                   |
| `NaN`      | NaN       | 0                 | stack overflow      |
| `Infinity` | Infinity  | **loops forever** | stack overflow      |
| `"5"`      | 15        | 15                | 28 (silently wrong) |
| `2 ** 53`  | imprecise | effectively hangs | effectively hangs   |

Now all three fail fast with the same message, e.g. `n must be an integer from -134217727 to 134217727, got 2.5 (number)`.

## Tests

- Known values for each implementation, including negatives, `0` and `-0`.
- All three agree with an exact `BigInt` reference for every `n` from -2000 to 2000, and at `±MAX_N`.
- `MAX_N` is proven to be the largest `n` whose sum is a safe integer.
- Every invalid input above throws instead of hanging or guessing.

## Run

```bash
npm install
npm test          # node:test via tsx
npm run check     # type-check + format check + tests
```
