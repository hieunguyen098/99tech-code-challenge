import express from "express";
import type { AddressInfo } from "node:net";
import { pino } from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createShutdown, listen } from "../src/lifecycle.js";

const silent = pino({ level: "silent" });

describe("listen", () => {
  it("resolves once the port is bound", async () => {
    const server = await listen(express(), 0);
    expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
    server.close();
  });

  it("rejects when the port is in use, instead of reporting success", async () => {
    // Regression: Express 5 passes this error to the listen callback, which was
    // treated as "listening", so the server logged success and exited with code 0.
    const first = await listen(express(), 0);
    const { port } = first.address() as AddressInfo;
    await expect(listen(express(), port)).rejects.toMatchObject({
      code: "EADDRINUSE",
    });
    first.close();
  });
});

describe("createShutdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    let finishClose = () => {};
    const server = {
      close: vi.fn((callback: () => void) => {
        finishClose = callback; // in-flight requests are still draining until called
      }),
    };
    const onClosed = vi.fn();
    const exit = vi.fn();
    const shutdown = createShutdown({
      server: server as never,
      logger: silent,
      onClosed,
      exit,
      timeoutMs: 10_000,
    });
    return { server, onClosed, exit, shutdown, drain: () => finishClose() };
  }

  it("closes the database and exits 0 only after requests drain", () => {
    const { onClosed, exit, shutdown, drain } = setup();
    shutdown("SIGTERM");
    expect(onClosed).not.toHaveBeenCalled();

    drain();
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("ignores a second signal while draining", () => {
    // Regression: a second signal closed the database under in-flight requests.
    const { server, onClosed, exit, shutdown } = setup();
    shutdown("SIGTERM");
    shutdown("SIGINT");
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(onClosed).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("forces exit 1 if draining takes too long", () => {
    vi.useFakeTimers();
    const { exit, shutdown } = setup();
    shutdown("SIGTERM");
    vi.advanceTimersByTime(10_000);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
