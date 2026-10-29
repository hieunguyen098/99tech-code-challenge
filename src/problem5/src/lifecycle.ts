import type { Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "./logger.js";

/**
 * Starts listening and resolves once the port is bound. Express 5 passes listen errors
 * (e.g. EADDRINUSE) to the listen callback, so treating that callback as "listening"
 * logged a failed start as a success and exited with code 0; this rejects instead.
 */
export function listen(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (error) => {
      if (error) reject(error);
      else resolve(server);
    });
  });
}

interface ShutdownOptions {
  server: Pick<Server, "close">;
  logger: Logger;
  /** Runs once the server has stopped accepting and finished in-flight requests. */
  onClosed: () => void;
  /** How long in-flight requests get before shutdown stops waiting. */
  timeoutMs?: number;
  exit?: (code: number) => void;
}

/**
 * Returns a signal handler for graceful shutdown: stop accepting connections, let
 * in-flight requests finish, run `onClosed` (close the database), then exit. It runs
 * once: a second signal (Ctrl+C twice, or SIGTERM then SIGINT) must not close the
 * database under requests that are still draining.
 */
export function createShutdown({
  server,
  logger,
  onClosed,
  timeoutMs = 10_000,
  exit = (code) => process.exit(code),
}: ShutdownOptions): (signal: string) => void {
  let shuttingDown = false;
  return (signal) => {
    if (shuttingDown) {
      logger.warn({ signal }, "Already shutting down");
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");

    server.close(() => {
      onClosed();
      exit(0);
    });
    // A client holding a connection open must not keep the process alive forever.
    setTimeout(() => {
      logger.error("Shutdown timed out; forcing exit");
      exit(1);
    }, timeoutMs).unref();
  };
}
