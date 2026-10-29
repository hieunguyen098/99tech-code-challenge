import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { createDatabase, runMigrations } from "../src/db/database.js";
import { MIGRATIONS } from "../src/db/migrations.js";
import { TaskRepository } from "../src/tasks/task.repository.js";
import { listTasksQuerySchema } from "../src/tasks/task.schema.js";

/**
 * Guards the indexes from migration 2: each common list query must be served by an
 * index, never by sorting the whole table (`USE TEMP B-TREE FOR ORDER BY`). This fails
 * if a sort expression in the repository drifts from the one an index was built on.
 */
function selectPlan(raw: Record<string, string>): string {
  const db = createDatabase(":memory:");
  const statements: string[] = [];
  const prepare = db.prepare.bind(db);
  (db as { prepare: typeof db.prepare }).prepare = ((sql: string) => {
    statements.push(sql);
    return prepare(sql);
  }) as typeof db.prepare;

  new TaskRepository(db).list(listTasksQuerySchema.parse(raw));
  const select = statements.find(
    (sql) => sql.startsWith("SELECT * FROM tasks") && sql.includes("LIMIT"),
  )!;
  const params = (select.match(/\?/g) ?? []).map(() => "x");
  return (
    prepare(`EXPLAIN QUERY PLAN ${select}`).all(...params) as {
      detail: string;
    }[]
  )
    .map((row) => row.detail)
    .join(" | ");
}

describe("list query plans", () => {
  it.each([
    ["the default list (newest first)", {}, "idx_tasks_created"],
    ["oldest first", { order: "asc" }, "idx_tasks_created"],
    ["sort by updatedAt", { sort: "updatedAt" }, "idx_tasks_updated"],
    ["status filter", { status: "todo" }, "idx_tasks_status_created"],
    ["sort by priority", { sort: "priority" }, "idx_tasks_priority_rank"],
    ["sort by title", { sort: "title", order: "asc" }, "idx_tasks_title"],
  ])("serves %s from an index", (_label, query, index) => {
    const plan = selectPlan(query);
    expect(plan).toContain(index);
    expect(plan).not.toContain("TEMP B-TREE");
  });
});

describe("migration 2", () => {
  it("adds the list indexes and drops the redundant status index", () => {
    const db = new Database(":memory:");
    runMigrations(db, MIGRATIONS.slice(0, 1)); // a database still on version 1
    runMigrations(db);

    const indexes = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name",
        )
        .all() as { name: string }[]
    ).map((row) => row.name);
    expect(indexes).toEqual([
      "idx_tasks_created",
      "idx_tasks_due_date",
      "idx_tasks_priority_rank",
      "idx_tasks_status_created",
      "idx_tasks_title",
      "idx_tasks_updated",
    ]);
  });
});
