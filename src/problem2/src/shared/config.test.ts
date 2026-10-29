import { afterEach, describe, expect, it, vi } from "vitest";

// config is read once at import time, so each case re-imports it with a fresh env.
async function loadConfig() {
  vi.resetModules();
  return (await import("./config")).config;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("config.pricesUrl", () => {
  it("uses VITE_PRICES_URL when set", async () => {
    vi.stubEnv("VITE_PRICES_URL", "https://example.test/prices.json");
    expect((await loadConfig()).pricesUrl).toBe(
      "https://example.test/prices.json",
    );
  });

  it("falls back to the default when VITE_PRICES_URL is empty", async () => {
    vi.stubEnv("VITE_PRICES_URL", "");
    expect((await loadConfig()).pricesUrl).toBe(
      "https://interview.switcheo.com/prices.json",
    );
  });
});
