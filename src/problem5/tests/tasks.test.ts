import { pino } from "pino";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createDatabase, type DB } from "../src/db/database.js";

let app: ReturnType<typeof createApp>;
let db: DB;

beforeEach(() => {
  db = createDatabase(":memory:");
  app = createApp({ db, logger: pino({ level: "silent" }) });
});

const createTask = (body: object) =>
  request(app).post("/api/tasks").send(body).expect(201);

describe("POST /api/tasks", () => {
  it("creates a task with defaults", async () => {
    const res = await createTask({ title: "  Write tests  " });
    expect(res.headers.location).toBe(`/api/tasks/${res.body.data.id}`);
    expect(res.body.data).toMatchObject({
      title: "Write tests",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
    });
    expect(res.body.data.createdAt).toBe(res.body.data.updatedAt);
  });

  it.each([
    [{}, "title"],
    [{ title: "" }, "title"],
    [{ title: "x", status: "blocked" }, "status"],
    [{ title: "x", dueDate: "31/12/2026" }, "dueDate"],
    [{ title: "x", unknown: true }, ""],
  ])("rejects invalid body %o", async (body, path) => {
    const res = await request(app).post("/api/tasks").send(body).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(
      res.body.error.details.map((d: { path: string }) => d.path),
    ).toContain(path);
  });

  it("rejects malformed JSON", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send('{"title":')
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns a task", async () => {
    const { body } = await createTask({ title: "Read me" });
    const res = await request(app)
      .get(`/api/tasks/${body.data.id}`)
      .expect(200);
    expect(res.body.data.title).toBe("Read me");
  });

  it("404s for a missing task and 400s for a bad id", async () => {
    await request(app).get("/api/tasks/999").expect(404);
    await request(app).get("/api/tasks/abc").expect(400);
  });
});

describe("GET /api/tasks", () => {
  beforeEach(async () => {
    await createTask({
      title: "Alpha report",
      status: "done",
      priority: "low",
      dueDate: "2026-01-10",
    });
    await createTask({
      title: "Beta launch",
      status: "in_progress",
      priority: "high",
      dueDate: "2026-03-01",
    });
    await createTask({
      title: "Gamma",
      description: "Prepare the report",
      priority: "medium",
    });
    await createTask({
      title: "100% done_ish",
      status: "done",
      priority: "high",
      dueDate: "2026-02-15",
    });
  });

  const list = async (query: Record<string, string> = {}) =>
    (await request(app).get("/api/tasks").query(query).expect(200)).body;

  it("returns everything, newest first, with pagination meta", async () => {
    const body = await list();
    expect(body.data.map((t: { title: string }) => t.title)).toEqual([
      "100% done_ish",
      "Gamma",
      "Beta launch",
      "Alpha report",
    ]);
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
  });

  it("filters by one or many statuses and priorities", async () => {
    expect((await list({ status: "done" })).meta.total).toBe(2);
    expect((await list({ status: "todo,in_progress" })).meta.total).toBe(2);
    expect(
      (await list({ status: "done", priority: "high" })).data[0].title,
    ).toBe("100% done_ish");
  });

  it("searches title and description, treating % and _ literally", async () => {
    expect((await list({ q: "report" })).meta.total).toBe(2);
    expect(
      (await list({ q: "%" })).data.map((t: { title: string }) => t.title),
    ).toEqual(["100% done_ish"]);
    expect((await list({ q: "_" })).meta.total).toBe(1);
  });

  it("filters by due date range", async () => {
    const body = await list({
      dueAfter: "2026-02-01",
      dueBefore: "2026-02-28",
    });
    expect(body.data.map((t: { title: string }) => t.title)).toEqual([
      "100% done_ish",
    ]);
  });

  it("sorts by priority and by due date with undated tasks last", async () => {
    const byPriority = await list({ sort: "priority", order: "asc" });
    expect(
      byPriority.data.map((t: { priority: string }) => t.priority),
    ).toEqual(["low", "medium", "high", "high"]);

    const byDue = await list({ sort: "dueDate", order: "desc" });
    expect(
      byDue.data.map((t: { dueDate: string | null }) => t.dueDate),
    ).toEqual(["2026-03-01", "2026-02-15", "2026-01-10", null]);
  });

  it("paginates", async () => {
    const body = await list({ limit: "3", page: "2" });
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });
  });

  it("rejects invalid filters", async () => {
    await request(app).get("/api/tasks").query({ status: "nope" }).expect(400);
    await request(app).get("/api/tasks").query({ limit: "1000" }).expect(400);
    await request(app)
      .get("/api/tasks")
      .query({ sort: "id; DROP TABLE tasks" })
      .expect(400);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("updates only the provided fields", async () => {
    const { body } = await createTask({
      title: "Draft",
      priority: "low",
      dueDate: "2026-05-01",
    });
    const res = await request(app)
      .patch(`/api/tasks/${body.data.id}`)
      .send({ status: "done", dueDate: null })
      .expect(200);
    expect(res.body.data).toMatchObject({
      title: "Draft",
      priority: "low",
      status: "done",
      dueDate: null,
    });
    expect(res.body.data.updatedAt >= body.data.updatedAt).toBe(true);
  });

  it("rejects empty or invalid updates", async () => {
    const { body } = await createTask({ title: "Draft" });
    await request(app).patch(`/api/tasks/${body.data.id}`).send({}).expect(400);
    await request(app)
      .patch(`/api/tasks/${body.data.id}`)
      .send({ title: "" })
      .expect(400);
    await request(app)
      .patch(`/api/tasks/${body.data.id}`)
      .send({ id: 5 })
      .expect(400);
  });

  it("404s for a missing task", async () => {
    await request(app).patch("/api/tasks/999").send({ title: "x" }).expect(404);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes a task", async () => {
    const { body } = await createTask({ title: "Temp" });
    await request(app).delete(`/api/tasks/${body.data.id}`).expect(204);
    await request(app).get(`/api/tasks/${body.data.id}`).expect(404);
    await request(app).delete(`/api/tasks/${body.data.id}`).expect(404);
  });
});

it("returns a JSON 404 for unknown routes", async () => {
  const res = await request(app).get("/nope").expect(404);
  expect(res.body.error.code).toBe("NOT_FOUND");
});

describe("strict request parsing", () => {
  it.each(["1e0", "0x1", "1.0", "%201", "01", "-1", "0"])(
    "rejects the non-canonical id %s instead of resolving it to a task",
    async (id) => {
      await createTask({ title: "Only task" });
      const res = await request(app).get(`/api/tasks/${id}`).expect(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("rejects ids beyond the safe integer range", async () => {
    const res = await request(app)
      .get("/api/tasks/99999999999999999999")
      .expect(400);
    expect(res.body.error.details[0].message).toBe("Number is too large");
  });

  it.each(["limit=1e1", "limit=10.0", "page=0x2", "page=0", "limit=101"])(
    "rejects the loosely written query %s",
    async (query) => {
      await request(app).get(`/api/tasks?${query}`).expect(400);
    },
  );

  it("rejects a due date range that ends before it starts", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .query({ dueAfter: "2026-12-01", dueBefore: "2026-01-01" })
      .expect(400);
    expect(res.body.error.details[0]).toEqual({
      path: "dueAfter",
      message: "dueAfter must be on or before dueBefore",
    });
  });
});

describe("request bodies", () => {
  it("answers 413, not 500, for a body over the size limit", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ title: "x".repeat(200_000) }))
      .expect(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("answers 415 for a body that is not JSON", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "text/plain")
      .send('{"title":"x"}')
      .expect(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("treats a missing body as empty, so the error names the missing field", async () => {
    const res = await request(app).post("/api/tasks").expect(400);
    expect(res.body.error.details).toEqual([
      {
        path: "title",
        message: "Invalid input: expected string, received undefined",
      },
    ]);
  });
});

describe("unsupported methods", () => {
  it("answers 405 with the allowed methods", async () => {
    const { body } = await createTask({ title: "Task" });
    const res = await request(app)
      .put(`/api/tasks/${body.data.id}`)
      .send({ title: "x" })
      .expect(405);
    expect(res.headers.allow).toBe("GET, PATCH, DELETE");
    expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");

    const collection = await request(app).delete("/api/tasks").expect(405);
    expect(collection.headers.allow).toBe("GET, POST");
  });

  it("answers OPTIONS with the allowed methods", async () => {
    const res = await request(app).options("/api/tasks/1").expect(204);
    expect(res.headers.allow).toBe("GET, PATCH, DELETE");
  });
});

describe("operational behaviour", () => {
  it("reports healthy while the database answers", async () => {
    await request(app).get("/health").expect(200, { status: "ok" });
  });

  it("reports 503, not ok, when the database is unavailable", async () => {
    db.close();
    await request(app).get("/health").expect(503, { status: "unavailable" });
  });

  it("gives every response a request id, reusing a safe one from the client", async () => {
    const generated = await request(app).get("/health");
    expect(generated.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const reused = await request(app)
      .get("/health")
      .set("X-Request-Id", "trace-abc_123");
    expect(reused.headers["x-request-id"]).toBe("trace-abc_123");
  });

  it("replaces an unsafe client request id instead of logging it", async () => {
    const res = await request(app)
      .get("/health")
      .set("X-Request-Id", "bad id with spaces <script>");
    expect(res.headers["x-request-id"]).not.toContain("bad id");
  });

  it("sends standard security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("missing tasks", () => {
  it("are reported the same way by GET, PATCH and DELETE", async () => {
    const responses = await Promise.all([
      request(app).get("/api/tasks/999"),
      request(app).patch("/api/tasks/999").send({ title: "x" }),
      request(app).delete("/api/tasks/999"),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({
        code: "NOT_FOUND",
        message: "Task 999 not found",
      });
    }
  });
});

describe("review fixes", () => {
  it("answers an undecodable URL with 400, not 500", async () => {
    const res = await request(app).get("/api/tasks/%E0").expect(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("answers a corrupt gzip body with 400, not 500", async () => {
    await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .set("Content-Encoding", "gzip")
      .send(Buffer.from("not gzip at all"))
      .expect(400);
  });

  it("checks the content type only on routes that take a body", async () => {
    // Before, these all returned 415 because the check ran ahead of routing.
    await request(app)
      .post("/api/unknown")
      .set("Content-Type", "text/plain")
      .send("hi")
      .expect(404);
    await request(app)
      .get("/health")
      .set("Content-Type", "text/plain")
      .send("hi")
      .expect(200);
    await request(app)
      .get("/api/tasks")
      .set("Content-Type", "text/plain")
      .send("hi")
      .expect(200);
  });

  it("names the id field when an id is invalid", async () => {
    const res = await request(app).get("/api/tasks/abc").expect(400);
    expect(res.body.error.details).toEqual([
      { path: "id", message: "Expected a positive whole number" },
    ]);
  });
});
