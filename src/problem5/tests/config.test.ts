import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("uses defaults when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      databasePath: "./data/app.db",
      logLevel: "info",
    });
  });

  it("reads valid values", () => {
    expect(
      loadConfig({ PORT: "8080", DATABASE_PATH: "/tmp/tasks.db" }),
    ).toEqual({
      port: 8080,
      databasePath: "/tmp/tasks.db",
      logLevel: "info",
    });
  });

  it("treats empty values as unset, not as port 0 or a throwaway database", () => {
    expect(loadConfig({ PORT: "", DATABASE_PATH: "" })).toEqual({
      port: 3000,
      databasePath: "./data/app.db",
      logLevel: "info",
    });
  });

  it.each(["abc", "0", "70000", "80.5", "1e3"])(
    "rejects PORT=%s with a clear message",
    (port) => {
      expect(() => loadConfig({ PORT: port })).toThrow(
        /^Invalid configuration: PORT /,
      );
    },
  );
});

describe("LOG_LEVEL", () => {
  it("accepts a known level", () => {
    expect(loadConfig({ LOG_LEVEL: "debug" }).logLevel).toBe("debug");
  });

  it("rejects an unknown level", () => {
    expect(() => loadConfig({ LOG_LEVEL: "verbose" })).toThrow(
      /^Invalid configuration: LOG_LEVEL /,
    );
  });
});
