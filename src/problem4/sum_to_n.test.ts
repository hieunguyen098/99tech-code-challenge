import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_N, sum_to_n_a, sum_to_n_b, sum_to_n_c } from "./sum_to_n.ts";

const implementations = { sum_to_n_a, sum_to_n_b, sum_to_n_c };

/** Exact reference using BigInt, so it can't share a floating point bug with the code. */
function referenceSum(n: number): number {
  const m = BigInt(Math.abs(n));
  const sum = (m * (m + 1n)) / 2n;
  return Number(n < 0 ? -sum : sum);
}

const cases: Array<[n: number, expected: number]> = [
  [0, 0],
  [1, 1],
  [2, 3],
  [5, 15],
  [10, 55],
  [100, 5050],
  [-1, -1],
  [-5, -15],
  [100_000, 5_000_050_000],
];

for (const [name, sum] of Object.entries(implementations)) {
  describe(name, () => {
    for (const [n, expected] of cases) {
      it(`sum_to_n(${n}) === ${expected}`, () => {
        assert.equal(sum(n), expected);
      });
    }

    it("is exact at the largest valid n, in both directions", () => {
      assert.equal(sum(MAX_N), referenceSum(MAX_N));
      assert.equal(sum(-MAX_N), referenceSum(-MAX_N));
    });

    it("rejects input outside the contract instead of hanging or guessing", () => {
      const invalid: unknown[] = [
        2.5,
        -2.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        MAX_N + 1,
        -(MAX_N + 1),
        "5",
      ];
      for (const n of invalid) {
        assert.throws(() => sum(n as number), RangeError, `input ${String(n)}`);
      }
    });
  });
}

describe("all three implementations", () => {
  it("agree with each other and with an exact reference for every n in -2000..2000", () => {
    for (let n = -2000; n <= 2000; n++) {
      const expected = referenceSum(n);
      assert.equal(sum_to_n_a(n), expected, `a(${n})`);
      assert.equal(sum_to_n_b(n), expected, `b(${n})`);
      assert.equal(sum_to_n_c(n), expected, `c(${n})`);
    }
  });

  it("treat -0 as 0", () => {
    for (const sum of Object.values(implementations)) {
      assert.ok(Object.is(sum(-0), 0));
    }
  });
});

describe("MAX_N", () => {
  it("is the largest n whose sum is a safe integer", () => {
    const max = BigInt(Number.MAX_SAFE_INTEGER);
    const sumOf = (m: number) => (BigInt(m) * BigInt(m + 1)) / 2n;
    assert.ok(sumOf(MAX_N) <= max);
    assert.ok(sumOf(MAX_N + 1) > max);
  });
});
