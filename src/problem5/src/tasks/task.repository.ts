import type { Statement } from "better-sqlite3";
import type { DB } from "../db/database.js";
import type {
  CreateTaskInput,
  ListTasksQuery,
  Task,
  UpdateTaskInput,
} from "./task.schema.js";

interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Whitelisted ORDER BY expressions: user input never reaches the SQL string directly.
const SORT_COLUMNS: Record<ListTasksQuery["sort"], string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  dueDate: "due_date",
  title: "title COLLATE NOCASE",
  priority: "CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END",
};

const UPDATABLE_COLUMNS: Record<keyof UpdateTaskInput, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  dueDate: "due_date",
};

const escapeLike = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * All SQL for tasks. Fixed statements are prepared once, when the repository is created,
 * and reused for every call (the way better-sqlite3 is meant to be used). `list` and
 * `update` build their SQL from the request; each distinct SQL string is compiled once
 * and cached. The number of shapes is bounded (filters × sort × update fields).
 */
export class TaskRepository {
  private readonly insert;
  private readonly selectById;
  private readonly deleteById;
  private readonly dynamic = new Map<string, Statement<unknown[], unknown>>();

  constructor(private readonly db: DB) {
    this.insert = db.prepare<unknown[], TaskRow>(
      `INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    );
    this.selectById = db.prepare<[number], TaskRow>(
      "SELECT * FROM tasks WHERE id = ?",
    );
    this.deleteById = db.prepare<[number]>("DELETE FROM tasks WHERE id = ?");
  }

  /** `now` is the creation time (ISO 8601), decided by the caller, not read here. */
  create(input: CreateTaskInput, now: string): Task {
    const row = this.insert.get(
      input.title,
      input.description,
      input.status,
      input.priority,
      input.dueDate,
      now,
      now,
    );
    return toTask(row!);
  }

  findById(id: number): Task | null {
    const row = this.selectById.get(id);
    return row ? toTask(row) : null;
  }

  list(query: ListTasksQuery): { items: Task[]; total: number } {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      where.push(`status IN (${query.status.map(() => "?").join(", ")})`);
      params.push(...query.status);
    }
    if (query.priority) {
      where.push(`priority IN (${query.priority.map(() => "?").join(", ")})`);
      params.push(...query.priority);
    }
    if (query.q) {
      where.push(
        `(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`,
      );
      const pattern = `%${escapeLike(query.q)}%`;
      params.push(pattern, pattern);
    }
    if (query.dueBefore) {
      where.push("due_date <= ?");
      params.push(query.dueBefore);
    }
    if (query.dueAfter) {
      where.push("due_date >= ?");
      params.push(query.dueAfter);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const direction = query.order === "asc" ? "ASC" : "DESC";
    // Tasks without a due date always sort last; id breaks ties so pagination is stable.
    const orderSql = `ORDER BY ${query.sort === "dueDate" ? "due_date IS NULL, " : ""}${SORT_COLUMNS[query.sort]} ${direction}, id ${direction}`;

    // One read transaction, so `total` and the page come from the same snapshot even
    // if another process (e.g. the seed script) writes in between.
    return this.db.transaction(() => {
      const { total } = this.prepared<{ total: number }>(
        `SELECT COUNT(*) AS total FROM tasks ${whereSql}`,
      ).get(...params)!;
      const rows = this.prepared<TaskRow>(
        `SELECT * FROM tasks ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      ).all(...params, query.limit, (query.page - 1) * query.limit);
      return { items: rows.map(toTask), total };
    })();
  }

  /** `now` becomes `updatedAt` (ISO 8601). Returns null if there is no such task. */
  update(id: number, input: UpdateTaskInput, now: string): Task | null {
    const entries = Object.entries(input).filter(
      ([, value]) => value !== undefined,
    ) as Array<[keyof UpdateTaskInput, unknown]>;
    const assignments = entries.map(([key]) => `${UPDATABLE_COLUMNS[key]} = ?`);
    const row = this.prepared<TaskRow>(
      `UPDATE tasks SET ${[...assignments, "updated_at = ?"].join(", ")} WHERE id = ? RETURNING *`,
    ).get(...entries.map(([, value]) => value), now, id);
    return row ? toTask(row) : null;
  }

  delete(id: number): boolean {
    return this.deleteById.run(id).changes > 0;
  }

  /** Compiles `sql` the first time it is seen, then reuses the statement. */
  private prepared<Row>(sql: string): Statement<unknown[], Row> {
    let statement = this.dynamic.get(sql);
    if (!statement) {
      statement = this.db.prepare<unknown[], unknown>(sql);
      this.dynamic.set(sql, statement);
    }
    return statement as Statement<unknown[], Row>;
  }
}
