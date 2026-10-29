import type { RequestHandler } from "express";
import { HttpError } from "./errors.js";

/**
 * Register after a path's routes: answers any other method with 405 and the `Allow`
 * header, and OPTIONS with 204 and the same header.
 */
export function methodNotAllowed(allowed: string[]): RequestHandler {
  const allow = allowed.join(", ");
  return (req, res, next) => {
    res.set("Allow", allow);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next(
      new HttpError(
        405,
        "METHOD_NOT_ALLOWED",
        `${req.method} is not allowed here; use ${allow}`,
      ),
    );
  };
}
