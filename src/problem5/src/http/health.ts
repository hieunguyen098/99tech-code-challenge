import type { RequestHandler } from "express";
import type { DB } from "../db/database.js";

/**
 * Readiness check: 200 only if the database actually answers, so a load balancer or
 * orchestrator stops sending traffic to an instance that can't serve it. (The old
 * check always said "ok", even with a broken database.)
 */
export function healthCheck(db: DB): RequestHandler {
  // Prepared once: load balancers poll this every few seconds per instance.
  const ping = db.prepare("SELECT 1");
  return (_req, res) => {
    try {
      ping.get();
      res.json({ status: "ok" });
    } catch (err) {
      // pino-http logs it once, on the request's completion line.
      res.err = err instanceof Error ? err : new Error(String(err));
      res.status(503).json({ status: "unavailable" });
    }
  };
}
