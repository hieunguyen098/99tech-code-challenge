/**
 * Schema migrations, applied in order and tracked with SQLite's built-in
 * `PRAGMA user_version` counter (see `runMigrations`).
 *
 * Append-only: never edit a migration that has run anywhere, add a new one instead.
 * Versions must be 1, 2, 3… with no gaps. They live in TypeScript rather than loose
 * .sql files so the compiler ships them in dist/ with the rest of the app.
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "create tasks",
    // IF NOT EXISTS so a database created before migrations were versioned (version 0,
    // table already present) adopts this history without losing any data.
    sql: `
      CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        description TEXT    NOT NULL DEFAULT '',
        status      TEXT    NOT NULL DEFAULT 'todo'   CHECK (status IN ('todo', 'in_progress', 'done')),
        priority    TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        due_date    TEXT,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
    `,
  },
  {
    version: 2,
    name: "indexes for list sorting and filtering",
    // Without these, every list request sorted the whole table (`USE TEMP B-TREE FOR
    // ORDER BY`): 63 ms for the default list and 425 ms for a deep page at 200k rows,
    // during which the synchronous driver blocks every other request. With them those
    // take 0.1 ms and 1.1 ms (see bench/list-queries.ts).
    //
    // Each index matches an ORDER BY in task.repository.ts exactly (the priority one is
    // the same CASE expression); tests/query-plans.test.ts fails if they drift apart.
    // (status, created_at, id) also serves status filters, so the plain status index
    // from version 1 is redundant.
    sql: `
      CREATE INDEX idx_tasks_created        ON tasks (created_at, id);
      CREATE INDEX idx_tasks_updated        ON tasks (updated_at, id);
      CREATE INDEX idx_tasks_status_created ON tasks (status, created_at, id);
      CREATE INDEX idx_tasks_title          ON tasks (title COLLATE NOCASE, id);
      CREATE INDEX idx_tasks_priority_rank  ON tasks (
        (CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END), id
      );
      DROP INDEX IF EXISTS idx_tasks_status;
    `,
  },
];
