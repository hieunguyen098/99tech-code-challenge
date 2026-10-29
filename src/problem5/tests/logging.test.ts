import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createDatabase } from "../src/db/database.js";
import { createLogger } from "../src/logger.js";

/** An app whose logs are captured as parsed JSON objects. */
function appWithCapturedLogs() {
  const lines: Array<Record<string, any>> = [];
  const logger = createLogger("info", {
    write: (line: string) => lines.push(JSON.parse(line)),
  });
  return { app: createApp({ db: createDatabase(":memory:"), logger }), lines };
}

describe("request logging", () => {
  it("logs each request once, under the id returned to the client", async () => {
    const { app, lines } = appWithCapturedLogs();
    const res = await request(app).get("/api/tasks");

    const requestLogs = lines.filter((line) => line.req?.url === "/api/tasks");
    expect(requestLogs).toHaveLength(1);
    expect(requestLogs[0]?.req.id).toBe(res.headers["x-request-id"]);
    expect(requestLogs[0]?.res.statusCode).toBe(200);
    expect(typeof requestLogs[0]?.responseTime).toBe("number");
  });

  it("logs client errors as warnings", async () => {
    const { app, lines } = appWithCapturedLogs();
    await request(app).get("/api/tasks/abc");
    const log = lines.find((line) => line.req?.url === "/api/tasks/abc");
    expect(log?.level).toBe(40); // pino's "warn"
  });

  it("never writes credentials to the logs", async () => {
    const { app, lines } = appWithCapturedLogs();
    await request(app)
      .get("/api/tasks")
      .set("Authorization", "Bearer super-secret-token")
      .set("Cookie", "session=super-secret-cookie")
      .set("Proxy-Authorization", "Basic super-secret-proxy");

    const written = JSON.stringify(lines);
    expect(written).not.toContain("super-secret");
    expect(written).toContain("[redacted]");
  });

  it("logs an unexpected failure exactly once, with the real error", async () => {
    const lines: Array<Record<string, any>> = [];
    const db = createDatabase(":memory:");
    const logger = createLogger("info", {
      write: (line: string) => lines.push(JSON.parse(line)),
    });
    const failing = createApp({ db, logger });
    db.close(); // every query now fails

    await request(failing).get("/api/tasks").expect(500);

    const errors = lines.filter((line) => line.level >= 50);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.err.message).toMatch(/database connection is not open/);
  });
});
