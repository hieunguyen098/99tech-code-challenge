import type { PriceFeedEntry } from "../features/tokens/tokens";

const date = "2023-08-29T07:10:40.000Z";

/** Round prices so expected conversions are easy to read in assertions. */
export const priceFeed: PriceFeedEntry[] = [
  { currency: "USDC", date, price: 1 },
  { currency: "ETH", date, price: 2000 },
  { currency: "WBTC", date, price: 25000 },
  { currency: "SWTH", date, price: 0.004 },
  { currency: "rSWTH", date, price: 0.004 },
];
