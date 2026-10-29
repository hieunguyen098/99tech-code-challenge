import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  createDatabase,
  runMigrations,
  schemaVersion,
} from "../src/db/database.js";
import { MIGRATIONS, type Migration } from "../src/db/migrations.js";

const tableNames = (db: Database.Database) =>
  db
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => row.name);

describe("migrations", () => {
  it("bring a new database to the latest version", () => {
    const db = createDatabase(":memory:");
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(tableNames(db)).toContain("tasks");
  });

  it("are numbered 1, 2, 3… without gaps", () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(
      MIGRATIONS.map((_, index) => index + 1),
    );
  });

  it("are idempotent: running them again changes nothing", () => {
    const db = createDatabase(":memory:");
    db.prepare(
      "INSERT INTO tasks (title, created_at, updated_at) VALUES ('kept', 'now', 'now')",
    ).run();
    expect(runMigrations(db)).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT COUNT(*) AS n FROM tasks").get()).toEqual({
      n: 1,
    });
  });

  it("adopt a database created before versioning, keeping its data", () => {
    // What databases made by the earlier code look like: tasks table, version 0.
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium', due_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    );
    db.prepare(
      "INSERT INTO tasks (title, created_at, updated_at) VALUES ('old task', 'now', 'now')",
    ).run();

    expect(runMigrations(db)).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT title FROM tasks").get()).toEqual({
      title: "old task",
    });
  });

  it("roll a failing migration back completely and keep the old version", () => {
    const db = new Database(":memory:");
    const migrations: Migration[] = [
      { version: 1, name: "ok", sql: "CREATE TABLE a (x INTEGER);" },
      {
        version: 2,
        name: "broken halfway",
        sql: "CREATE TABLE b (x INTEGER); THIS IS NOT SQL;",
      },
    ];
    expect(() => runMigrations(db, migrations)).toThrow();
    expect(schemaVersion(db)).toBe(1);
    expect(tableNames(db)).toEqual(["a"]); // table b was rolled back with it
  });

  it("refuse a database newer than this code", () => {
    const db = new Database(":memory:");
    db.pragma(`user_version = ${MIGRATIONS.length + 1}`);
    expect(() => runMigrations(db)).toThrow(/newer than this app supports/);
  });

  it("reject a list with gaps", () => {
    const db = new Database(":memory:");
    expect(() =>
      runMigrations(db, [{ version: 2, name: "skips 1", sql: "" }]),
    ).toThrow(/without gaps/);
  });
});
