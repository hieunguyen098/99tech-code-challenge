import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/http/error-handler.js";

function handle(err: unknown) {
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response & {
    err?: unknown;
  };
  errorHandler(err, {} as Request, res, () => {});
  return { res, json };
}

describe("errorHandler", () => {
  it("hands unexpected errors to the request logger once and returns nothing internal", () => {
    const err = new Error("SQLITE_CORRUPT: database disk image is malformed");
    const { res, json } = handle(err);

    expect(res.err).toBe(err); // pino-http logs it, with stack, on the completion line
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  });

  it("answers framework client errors with their own status instead of 500", () => {
    // The shape Express, the router and body-parser use (http-errors).
    const err = Object.assign(new Error("Failed to decode param '%E0'"), {
      status: 400,
      expose: true,
    });
    const { res, json } = handle(err);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: { code: "BAD_REQUEST", message: "Failed to decode param '%E0'" },
    });
    expect(res.err).toBeUndefined();
  });

  it("keeps the status but hides the message when an error isn't marked safe to show", () => {
    // The router's decode error: status 400, no `expose`.
    const err = Object.assign(new URIError("internal detail"), { status: 400 });
    const { res, json } = handle(err);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: { code: "BAD_REQUEST", message: "Bad Request" },
    });
  });

  it("treats a 5xx status on an error as unexpected", () => {
    const err = Object.assign(new Error("upstream"), { status: 502 });
    expect(handle(err).res.status).toHaveBeenCalledWith(500);
  });
});
