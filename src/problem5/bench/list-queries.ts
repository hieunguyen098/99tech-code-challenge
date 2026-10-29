/**
 * Benchmarks the real list queries on a large database, comparing the schema before and
 * after the list indexes (migration 2). Run with `npm run bench` (takes ~20 s).
 *
 * Each list() call is COUNT + one page, the median of 7 runs, on a fresh file database
 * in the OS temp folder. Numbers vary by machine; the ratios are what matter.
 */
import Database from "better-sqlite3";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMigrations } from "../src/db/database.js";
import { MIGRATIONS } from "../src/db/migrations.js";
import { TaskRepository } from "../src/tasks/task.repository.js";
import { listTasksQuerySchema } from "../src/tasks/task.schema.js";

const ROWS = 200_000;
const QUERIES: Array<[string, Record<string, string>]> = [
  ["default list (newest first)", {}],
  ["status=todo", { status: "todo" }],
  ["status=todo,in_progress", { status: "todo,in_progress" }],
  ["sort=priority", { sort: "priority" }],
  ["sort=title", { sort: "title", order: "asc" }],
  [
    "priority=high, sort=dueDate",
    { priority: "high", sort: "dueDate", order: "asc" },
  ],
  ["search q=report", { q: "report" }],
  ["deep page (page 5000)", { page: "5000" }],
];

function seed(db: Database.Database): void {
  const words = [
    "report",
    "launch",
    "fix",
    "deploy",
    "review",
    "design",
    "update",
    "plan",
    "test",
    "migrate",
  ];
  let state = 42;
  const random = () =>
    (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const insert = db.prepare(
    "INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const start = Date.parse("2025-01-01T00:00:00Z");
  db.transaction(() => {
    for (let i = 0; i < ROWS; i++) {
      const created = new Date(start + i * 300_000).toISOString();
      const r = random();
      const status = r < 0.6 ? "done" : r < 0.8 ? "in_progress" : "todo";
      const priority = ["low", "medium", "high"][Math.floor(random() * 3)];
      const due =
        random() < 0.7
          ? new Date(start + random() * 7e10).toISOString().slice(0, 10)
          : null;
      const title = `${words[Math.floor(random() * 10)]} ${words[Math.floor(random() * 10)]} #${i}`;
      insert.run(
        title,
        `notes for ${title}`,
        status,
        priority,
        due,
        created,
        created,
      );
    }
  })();
}

function measure(schemaVersion: number): { list: number[]; insertMs: number } {
  const path = join(tmpdir(), `problem5-bench-${process.pid}.db`);
  const cleanup = () =>
    ["", "-wal", "-shm"].forEach((suffix) =>
      rmSync(path + suffix, { force: true }),
    );
  cleanup();
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  runMigrations(db, MIGRATIONS.slice(0, schemaVersion));
  seed(db);

  const repository = new TaskRepository(db);
  const list = QUERIES.map(([, raw]) => {
    const query = listTasksQuerySchema.parse(raw);
    repository.list(query); // warm up
    const times = Array.from({ length: 7 }, () => {
      const start = performance.now();
      repository.list(query);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    return times[3]!;
  });

  const writeStart = performance.now();
  for (let i = 0; i < 2000; i++) {
    repository.create(
      {
        title: `write ${i}`,
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
      },
      new Date().toISOString(),
    );
  }
  const insertMs = (performance.now() - writeStart) / 2000;

  db.close();
  cleanup();
  return { list, insertMs };
}

const before = measure(1);
const after = measure(MIGRATIONS.length);
const ms = (value: number) => `${value.toFixed(value < 1 ? 2 : 1)} ms`;

console.log(
  `${ROWS.toLocaleString("en-US")} tasks; list() = COUNT + one page, median of 7 runs\n`,
);
console.log(
  `${"query".padEnd(30)} ${"schema v1".padStart(10)} ${"current".padStart(10)}`,
);
QUERIES.forEach(([label], i) => {
  console.log(
    `${label.padEnd(30)} ${ms(before.list[i]!).padStart(10)} ${ms(after.list[i]!).padStart(10)}`,
  );
});
console.log(
  `${"insert (one per transaction)".padEnd(30)} ${ms(before.insertMs).padStart(10)} ${ms(after.insertMs).padStart(10)}`,
);
