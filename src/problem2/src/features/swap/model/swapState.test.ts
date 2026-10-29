import { describe, expect, it } from "vitest";
import { withoutFloatNoise } from "../../../shared/lib/amount";
import type { Token } from "../../tokens";
import {
  createInitialSwapState,
  deriveInputs,
  swapReducer,
  type SwapState,
} from "./swapState";

const token = (symbol: string, price: number): Token => ({
  symbol,
  price,
  updatedAt: "",
  iconUrl: "",
});
const USDC = token("USDC", 1);
const ETH = token("ETH", 2000);
const ATOM = token("ATOM", 7);

const base: SwapState = {
  fromSymbol: "USDC",
  toSymbol: "ETH",
  input: "100",
  inputSide: "from",
};

describe("createInitialSwapState", () => {
  it("defaults to USDC -> ETH", () => {
    expect(createInitialSwapState([ATOM, ETH, USDC])).toMatchObject({
      fromSymbol: "USDC",
      toSymbol: "ETH",
    });
  });

  it("falls back to the first available tokens and never picks the same one twice", () => {
    expect(createInitialSwapState([ATOM, ETH])).toMatchObject({
      fromSymbol: "ATOM",
      toSymbol: "ETH",
    });
    expect(createInitialSwapState([ATOM])).toMatchObject({
      fromSymbol: "ATOM",
      toSymbol: null,
    });
  });
});

describe("swapReducer", () => {
  it("records which side the user typed in", () => {
    expect(
      swapReducer(base, { type: "inputChanged", side: "to", value: "2" }),
    ).toEqual({ ...base, input: "2", inputSide: "to" });
  });

  it("flips tokens and keeps the typed input with its token", () => {
    expect(swapReducer(base, { type: "tokensFlipped" })).toEqual({
      ...base,
      fromSymbol: "ETH",
      toSymbol: "USDC",
      inputSide: "to",
    });
  });

  it("selects a token for one side", () => {
    expect(
      swapReducer(base, { type: "tokenSelected", side: "to", symbol: "ATOM" }),
    ).toEqual({ ...base, toSymbol: "ATOM" });
  });

  it("swaps sides when picking the token already on the other side", () => {
    expect(
      swapReducer(base, { type: "tokenSelected", side: "to", symbol: "USDC" }),
    ).toEqual(swapReducer(base, { type: "tokensFlipped" }));
  });

  it("clears the input after a swap", () => {
    expect(swapReducer(base, { type: "inputCleared" }).input).toBe("");
  });
});

describe("deriveInputs", () => {
  it("converts from the side the user typed in", () => {
    expect(deriveInputs(base, USDC, ETH)).toEqual({
      fromInput: "100",
      toInput: "0.05",
    });
    expect(
      deriveInputs({ ...base, input: "0.5", inputSide: "to" }, USDC, ETH),
    ).toEqual({ fromInput: "1000", toInput: "0.5" });
  });

  it("leaves the other side empty until both tokens are chosen", () => {
    expect(deriveInputs(base, USDC, null)).toEqual({
      fromInput: "100",
      toInput: "",
    });
  });
});

describe("deriveInputs rounding", () => {
  // Prices chosen so conversions never divide evenly.
  const A = token("A", 7);
  const B = token("B", 3);
  const typed = (inputSide: "from" | "to", input: string): SwapState => ({
    fromSymbol: "A",
    toSymbol: "B",
    input,
    inputSide,
  });

  // Each example is a case where rounding to nearest would go the other way, so these
  // fail if the direction is ever lost (7/3 or 3/7 would not: nearest happens to agree).
  it("rounds what the user receives down", () => {
    const [two, three] = [token("A", 2), token("B", 3)];
    // 1 A = 2/3 B = 0.666666666…: nearest would give 0.66666667, more than it's worth.
    expect(deriveInputs(typed("from", "1"), two, three).toInput).toBe(
      "0.66666666",
    );
  });

  it("rounds what the user pays up", () => {
    const [three, one] = [token("A", 3), token("B", 1)];
    // receiving 1 B costs 1/3 A = 0.333333333…: nearest would give 0.33333333, too little.
    expect(deriveInputs(typed("to", "1"), three, one).fromInput).toBe(
      "0.33333334",
    );
  });

  it("never gives more than the payment is worth, or charges less than needed", () => {
    for (let k = 1; k <= 3000; k++) {
      const input = (k * 0.0137).toFixed(4);
      // References are noise-free decimals, like the app's own maths: 0.0411 × 7 ÷ 3 is
      // exactly 0.0959, though JavaScript computes 0.09589999999999999.
      const worth = withoutFloatNoise((Number(input) * A.price) / B.price);
      const received = Number(deriveInputs(typed("from", input), A, B).toInput);
      expect(received).toBeLessThanOrEqual(worth);
      expect(worth - received).toBeLessThan(1e-8);

      const cost = withoutFloatNoise((Number(input) * B.price) / A.price);
      const paid = Number(deriveInputs(typed("to", input), A, B).fromInput);
      expect(paid).toBeGreaterThanOrEqual(cost);
      expect(paid - cost).toBeLessThan(1e-8);
    }
  });
});
