import { describe, expect, it } from "vitest";
import {
  convertAmount,
  iconUrlFor,
  parsePriceFeed,
  searchTokens,
  type Token,
} from "./tokens";

describe("parsePriceFeed", () => {
  it("keeps the latest price per currency and drops unusable entries", () => {
    const tokens = parsePriceFeed([
      { currency: "ETH", date: "2023-08-29T07:10:00.000Z", price: 1000 },
      { currency: "ETH", date: "2023-08-29T07:10:52.000Z", price: 1645 },
      { currency: "ETH", date: "2023-08-29T07:10:30.000Z", price: 1200 },
      { currency: "NOPE", date: "2023-08-29T07:10:30.000Z", price: 0 },
      { currency: "atom", date: "2023-08-29T07:10:30.000Z", price: 7 },
    ]);
    expect(tokens.map((t) => [t.symbol, t.price])).toEqual([
      ["atom", 7],
      ["ETH", 1645],
    ]);
  });

  it("never lets an entry with a missing date block a newer one", () => {
    const [eth] = parsePriceFeed([
      { currency: "ETH", date: "", price: 1000 },
      { currency: "ETH", date: "2023-08-29T07:10:52.000Z", price: 1645 },
    ]);
    expect(eth?.price).toBe(1645);
  });

  it("maps symbols to the case-sensitive icon filenames", () => {
    expect(iconUrlFor("STEVMOS")).toMatch(/\/stEVMOS\.svg$/);
    expect(iconUrlFor("SWTH")).toMatch(/\/SWTH\.svg$/);
  });
});

describe("searchTokens", () => {
  const tokens = parsePriceFeed(
    ["rSWTH", "SWTH", "STOSMO", "USDC"].map((currency) => ({
      currency,
      date: "",
      price: 1,
    })),
  );
  const symbols = (query: string) =>
    searchTokens(tokens, query).map((t) => t.symbol);

  it("ranks exact, then prefix, then substring matches", () => {
    expect(symbols("swth")).toEqual(["SWTH", "rSWTH"]);
    expect(symbols("s")).toEqual(["STOSMO", "SWTH", "rSWTH", "USDC"]);
  });

  it("returns everything for an empty query and nothing for no match", () => {
    expect(symbols("  ")).toHaveLength(4);
    expect(symbols("zzz")).toEqual([]);
  });
});

describe("convertAmount", () => {
  const token = (symbol: string, price: number): Token => ({
    symbol,
    price,
    updatedAt: "",
    iconUrl: "",
  });

  it("converts through USD prices", () => {
    expect(convertAmount(4000, token("USDC", 1), token("ETH", 2000))).toBe(2);
    expect(convertAmount(1.5, token("ETH", 2000), token("USDC", 1))).toBe(3000);
  });
});
