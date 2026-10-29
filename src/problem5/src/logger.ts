import { pino, type DestinationStream, type Logger } from "pino";
import type { Config } from "./config.js";

export type { Logger };

/**
 * Request logs include headers, so credentials must never reach them: tokens and
 * session cookies in log storage are a classic leak.
 */
const REDACTED_PATHS = [
  "req.headers.authorization",
  'req.headers["proxy-authorization"]',
  "req.headers.cookie",
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
];

/**
 * Structured JSON logs (one object per line), ready for a log pipeline. Created once at
 * startup and passed into the app, so tests can pass a silent or capturing logger.
 */
export function createLogger(
  level: Config["logLevel"],
  destination?: DestinationStream,
): Logger {
  const options = {
    level,
    redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
  };
  return destination ? pino(options, destination) : pino(options);
}
