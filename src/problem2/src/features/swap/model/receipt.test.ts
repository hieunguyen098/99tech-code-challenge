import { describe, expect, it } from "vitest";
import { describeSwapReceipt } from "./receipt";

describe("describeSwapReceipt", () => {
  it("summarises both sides and the transaction", () => {
    expect(
      describeSwapReceipt({
        fromSymbol: "USDC",
        toSymbol: "ETH",
        fromAmount: 1234.5,
        toAmount: 0.6172,
        txHash: "0xabc",
      }),
    ).toBe("Swapped 1,234.5 USDC for 0.6172 ETH · tx 0xabc");
  });
});
