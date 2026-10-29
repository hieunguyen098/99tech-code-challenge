import type { ErrorRequestHandler } from "express";
import { STATUS_CODES } from "node:http";
import { ZodError } from "zod";
import { HttpError } from "./errors.js";

/**
 * Client errors raised by `express.json()`, keyed by their `type`. Without this map they
 * fell through to the generic handler, so a body over the size limit came back as a
 * 500 "Something went wrong" instead of a 413.
 */
const BODY_PARSER_ERRORS: Record<
  string,
  { status: number; code: string; message: string }
> = {
  "entity.parse.failed": {
    status: 400,
    code: "INVALID_JSON",
    message: "Request body is not valid JSON",
  },
  "entity.too.large": {
    status: 413,
    code: "PAYLOAD_TOO_LARGE",
    message: "Request body is too large",
  },
  "charset.unsupported": {
    status: 415,
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Request body charset is not supported",
  },
  "encoding.unsupported": {
    status: 415,
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Request body encoding is not supported",
  },
};

/**
 * Any other client error raised by Express, the router or body-parser, e.g. undecodable
 * `%E0` in a URL, a corrupt gzip body, or an aborted upload. Without this, each became a
 * 500 and an error alert for what is the client's mistake.
 *
 * Same rule as Express's own default handler: trust a 4xx `status` (or `statusCode`),
 * but show the error's message only when `expose` is true. The router's decode error
 * sets `status: 400` without `expose`, so it gets the standard "Bad Request" text.
 */
function clientError(
  err: unknown,
): { status: number; code: string; message: string } | null {
  if (typeof err !== "object" || err === null) return null;
  const { status, statusCode, expose, message } = err as Record<
    string,
    unknown
  >;
  const code = typeof status === "number" ? status : statusCode;
  if (typeof code !== "number" || code < 400 || code > 499) return null;

  const statusText = STATUS_CODES[code] ?? "Client Error";
  return {
    status: code,
    // "Bad Request" -> "BAD_REQUEST", matching the API's other error codes.
    code: statusText.toUpperCase().replace(/[^A-Z]+/g, "_"),
    message:
      expose === true && typeof message === "string" ? message : statusText,
  };
}

/** Turns every error into the API's `{ error: { code, message, details? } }` shape. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const bodyError = BODY_PARSER_ERRORS[err?.type];
  if (bodyError) {
    res.status(bodyError.status).json({
      error: { code: bodyError.code, message: bodyError.message },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const client = clientError(err);
  if (client) {
    res
      .status(client.status)
      .json({ error: { code: client.code, message: client.message } });
    return;
  }

  // Unexpected. Hand the error to pino-http, which logs it once (with the stack and
  // request id) on the request's completion line; logging it here too doubled alerts.
  res.err = err;
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
};
