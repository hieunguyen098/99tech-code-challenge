import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import type { Logger } from "../logger.js";

/** A client's id is reused only if it looks like one, so logs can't be polluted through it. */
const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

/**
 * Logs one line per request (method, path, status, duration) and gives every request an
 * id: the caller's `X-Request-Id` if it's safe, otherwise a new UUID. The id is returned
 * in the `X-Request-Id` response header and attached to every log line for the request
 * (via `req.log`), so a client's error report can be traced to the exact log entry.
 */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers["x-request-id"];
      const id =
        typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming)
          ? incoming
          : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    // A 4xx is the client's mistake (a warning); a 5xx is ours (an error).
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  });
}
