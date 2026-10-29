export const config = {
  // `||`, not `??`: an empty `VITE_PRICES_URL=` in .env must fall back to the default too.
  pricesUrl:
    import.meta.env.VITE_PRICES_URL ||
    "https://interview.switcheo.com/prices.json",
  /** Simulated latency of the mocked swap endpoint. */
  mockSwapDelayMs: 1800,
} as const;
