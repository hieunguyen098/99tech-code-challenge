import type { RequestHandler } from "express";
import { HttpError } from "./errors.js";

/** Last route in the app: anything that reaches it matched nothing. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new HttpError(
      404,
      "NOT_FOUND",
      `Route ${req.method} ${req.path} not found`,
    ),
  );
};
