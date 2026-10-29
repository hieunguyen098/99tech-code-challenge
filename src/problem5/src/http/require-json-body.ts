import type { RequestHandler } from "express";
import { HttpError } from "./errors.js";

/** Request bodies must be JSON; anything else is a 415, not a confusing validation error. */
export const requireJsonBody: RequestHandler = (req, _res, next) => {
  const hasBody =
    req.headers["transfer-encoding"] !== undefined ||
    Number(req.headers["content-length"] ?? 0) > 0;
  if (hasBody && !req.is("application/json")) {
    next(
      new HttpError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Request body must be JSON (Content-Type: application/json)",
      ),
    );
    return;
  }
  next();
};
