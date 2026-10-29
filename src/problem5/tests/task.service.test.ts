import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../src/db/database.js";
import { NotFoundError } from "../src/http/errors.js";
import { TaskRepository } from "../src/tasks/task.repository.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
} from "../src/tasks/task.schema.js";
import { TaskService } from "../src/tasks/task.service.js";

/**
 * Business rules are tested here: plain method calls on an in-memory database with a
 * clock the test controls. No HTTP involved.
 */
let time: Date;
let service: TaskService;

beforeEach(() => {
  time = new Date("2026-01-01T09:00:00.000Z");
  service = new TaskService(
    new TaskRepository(createDatabase(":memory:")),
    () => time,
  );
});

const newTask = (title = "Write tests") =>
  service.create(createTaskSchema.parse({ title }));

describe("TaskService", () => {
  it("stamps a new task with the current time", () => {
    const task = newTask();
    expect(task.createdAt).toBe("2026-01-01T09:00:00.000Z");
    expect(task.updatedAt).toBe(task.createdAt);
  });

  it("moves updatedAt to the time of the update, keeping createdAt", () => {
    const task = newTask();
    time = new Date("2026-01-02T10:30:00.000Z");

    const updated = service.update(task.id, { status: "done" });
    expect(updated.updatedAt).toBe("2026-01-02T10:30:00.000Z");
    expect(updated.createdAt).toBe("2026-01-01T09:00:00.000Z");
  });

  it.each([
    ["get", (s: TaskService) => s.get(999)],
    ["update", (s: TaskService) => s.update(999, { title: "x" })],
    ["delete", (s: TaskService) => s.delete(999)],
  ])("%s of a missing task is a NotFoundError", (_name, call) => {
    expect(() => call(service)).toThrow(
      new NotFoundError("Task 999 not found"),
    );
  });

  it("deletes an existing task", () => {
    const task = newTask();
    service.delete(task.id);
    expect(() => service.get(task.id)).toThrow(NotFoundError);
  });
});

describe("seedSampleTasks", () => {
  it("seeds an empty database once and is a no-op afterwards", async () => {
    const { seedSampleTasks } = await import("../src/scripts/sample-tasks.js");
    expect(seedSampleTasks(service)).toBe(6);
    expect(seedSampleTasks(service)).toBe(0);
    expect(service.list(listTasksQuerySchema.parse({})).total).toBe(6);
  });
});

describe("TaskRepository", () => {
  it("compiles each distinct list query once and reuses it", () => {
    const db = createDatabase(":memory:");
    const repository = new TaskRepository(db);
    const prepare = vi.spyOn(db, "prepare");
    const query = listTasksQuerySchema.parse({ status: "todo" });

    repository.list(query);
    repository.list(query);
    expect(prepare).toHaveBeenCalledTimes(2); // COUNT + SELECT, first call only
  });
});
