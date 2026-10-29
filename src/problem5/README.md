# Problem 5: A Crude Server

A CRUD REST API for **tasks**, built with **Express 5 + TypeScript**, persisted in **SQLite** (`better-sqlite3`), validated with **Zod**.

## Requirements

- Node.js **22.9+** (for `--env-file-if-exists`), npm

## Getting started

```bash
npm install
cp .env.example .env     # optional — defaults work out of the box
npm run seed             # optional — inserts 6 sample tasks
npm run dev              # http://localhost:3000, reloads on change
```

Production-style run:

```bash
npm run build
npm start
```

### Configuration

| Variable        | Default         | Description                                                                                        |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `PORT`          | `3000`          | HTTP port                                                                                          |
| `DATABASE_PATH` | `./data/app.db` | SQLite file path (created automatically along with the schema). Use `:memory:` for a throwaway DB. |
| `LOG_LEVEL`     | `info`          | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`                                     |

Settings are validated at startup. An empty value means "use the default" (so `PORT=` doesn't become port 0, a random port), and an invalid one stops the server with a clear message, e.g. `Invalid configuration: PORT must be a whole number`.

### Scripts

| Script                            | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                     | Start with `tsx watch`                                            |
| `npm run build` / `npm start`     | Compile to `dist/` and run it                                     |
| `npm run seed`                    | Insert sample data                                                |
| `npm test`                        | Unit and integration tests (Vitest + Supertest, in-memory SQLite) |
| `npm run typecheck`               | `tsc`: type-checks `src`, `tests` and `bench` (emits nothing)     |
| `npm run format` / `format:check` | Prettier                                                          |
| `npm run check`                   | Type-check + format check + tests (what CI would run)             |
| `npm run bench`                   | Time the list queries on 200k tasks, before vs. after the indexes |

## Resource: Task

```jsonc
{
  "id": 1,
  "title": "Write API documentation", // required, 1–200 chars
  "description": "Cover every endpoint", // optional, ≤ 2000 chars, default ""
  "status": "in_progress", // todo | in_progress | done (default todo)
  "priority": "medium", // low | medium | high (default medium)
  "dueDate": "2026-11-05", // YYYY-MM-DD or null
  "createdAt": "2026-10-29T06:05:47.225Z",
  "updatedAt": "2026-10-29T06:05:47.225Z",
}
```

## API

Base URL: `http://localhost:3000/api`

| Method   | Path         | Description                                            | Success                   |
| -------- | ------------ | ------------------------------------------------------ | ------------------------- |
| `POST`   | `/tasks`     | Create a task                                          | `201` + `Location` header |
| `GET`    | `/tasks`     | List tasks with filters                                | `200`                     |
| `GET`    | `/tasks/:id` | Get one task                                           | `200`                     |
| `PATCH`  | `/tasks/:id` | Partially update a task                                | `200`                     |
| `DELETE` | `/tasks/:id` | Delete a task                                          | `204`                     |
| `GET`    | `/health`    | Readiness: `200` if the database answers, `503` if not | `200`                     |

Other methods get `405 Method Not Allowed` with an `Allow` header (and `OPTIONS` answers `204` with it). Ids must be plain positive whole numbers: `/tasks/12`, not `/tasks/1e1`, `/tasks/0x0c` or `/tasks/12.0`.

### List filters (`GET /api/tasks`)

| Query param              | Example            | Description                                                        |
| ------------------------ | ------------------ | ------------------------------------------------------------------ |
| `status`                 | `todo,in_progress` | One or more statuses (comma-separated or repeated)                 |
| `priority`               | `high`             | One or more priorities                                             |
| `q`                      | `report`           | Case-insensitive search in title and description                   |
| `dueBefore` / `dueAfter` | `2026-12-31`       | Inclusive due date range; `dueAfter` must not be after `dueBefore` |
| `sort`                   | `dueDate`          | `createdAt` (default), `updatedAt`, `dueDate`, `priority`, `title` |
| `order`                  | `asc`              | `asc` or `desc` (default)                                          |
| `page` / `limit`         | `2` / `10`         | Pagination; plain whole numbers, `limit` 1–100, default 20         |

Response:

```json
{
  "data": [/* tasks */],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### Examples

```bash
# Create
curl -X POST localhost:3000/api/tasks -H 'Content-Type: application/json' \
  -d '{"title":"Ship v1","priority":"high","dueDate":"2026-12-01"}'

# List high-priority tasks that aren't done, soonest due first
curl 'localhost:3000/api/tasks?status=todo,in_progress&priority=high&sort=dueDate&order=asc'

# Get / update / delete
curl localhost:3000/api/tasks/1
curl -X PATCH localhost:3000/api/tasks/1 -H 'Content-Type: application/json' -d '{"status":"done"}'
curl -X DELETE localhost:3000/api/tasks/1
```

### Errors

Every error uses the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "title", "message": "Title is required" }]
  }
}
```

| Status | Code                     | When                                                                           |
| ------ | ------------------------ | ------------------------------------------------------------------------------ |
| 400    | `VALIDATION_ERROR`       | Invalid body, query or id (`details` lists each field)                         |
| 400    | `INVALID_JSON`           | Body is not valid JSON                                                         |
| 400    | `BAD_REQUEST`            | Other malformed requests, e.g. an undecodable URL or a corrupt compressed body |
| 404    | `NOT_FOUND`              | Unknown task or route                                                          |
| 405    | `METHOD_NOT_ALLOWED`     | Method not supported on that path (see `Allow` header)                         |
| 413    | `PAYLOAD_TOO_LARGE`      | Body over 100 KB                                                               |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | Body is not `application/json`, or uses an unsupported charset                 |
| 500    | `INTERNAL_ERROR`         | Unexpected server error (details are logged, not returned)                     |

## Project structure

```
src/
  server.ts               entry point: config → logger → database → listen
  lifecycle.ts            listen() that fails loudly; graceful shutdown that runs once
  app.ts                  createApp({ db, logger }): middleware stack + routes
  config.ts               validated env config (loadConfig)
  logger.ts               pino logger, credentials redacted
  db/
    database.ts           connection + runMigrations (tracked with PRAGMA user_version)
    migrations.ts         ordered, append-only schema migrations
  http/                   cross-cutting HTTP concerns, one per file
    errors.ts             HttpError, NotFoundError, orNotFound()
    pagination.ts         paginationMeta() for list responses
    error-handler.ts      every error → { error: { code, message, details? } }
    request-logger.ts     one log line per request + X-Request-Id
    require-json-body.ts  415 for non-JSON bodies
    method-not-allowed.ts 405 + Allow header
    not-found.ts          404 for unknown routes
    health.ts             readiness check
  tasks/                  the tasks resource
    task.schema.ts        Zod schemas + types (create, update, list query)
    task.service.ts       use cases + business rules (404s, timestamps)
    task.repository.ts    all SQL for tasks
    task.routes.ts        HTTP handlers
  scripts/
    seed.ts               entry point for npm run seed
    sample-tasks.ts       sample data; seeds only an empty database
tests/                    API, service, config, migrations, logging, query-plan tests
bench/list-queries.ts     list-query benchmark (npm run bench)
```

To add a resource, create a sibling of `tasks/` with its own schema, repository and routes, and mount it in `app.ts`.

## Design notes

- **SQLite via `better-sqlite3`**: zero setup for reviewers, synchronous and fast, and enough for a single-instance service. All SQL lives in repositories, so moving to Postgres would touch `db/` and the repositories only.
- **Versioned migrations**: an append-only list, each applied in its own transaction and recorded in SQLite's `user_version`. A failing migration rolls back completely; a database newer than the code is refused instead of risking corruption. Databases created before versioning existed adopt it without data loss.
- **Three layers with one job each**: routes speak HTTP (parse → one service call → respond), `TaskService` makes the decisions, and `TaskRepository` only runs SQL. The service owns the rules there are today ("the task must exist" and the clock for `createdAt`/`updatedAt`, which tests can fix) and is where every future business rule goes.
- **Observability**: JSON logs with one line per request (status, duration). Every request gets an id (the client's `X-Request-Id` if it's safe, otherwise a UUID), returned in the response and attached to all of that request's logs, including unexpected errors. Credentials (`Authorization`, `Proxy-Authorization`, `X-API-Key`, cookies) are redacted.
- **Operations**: `/health` checks the database, so a load balancer stops routing to a broken instance; shutdown drains in-flight requests and gives up after 10 s; `helmet` sets standard security headers.
- **Safe SQL**: every value is a bound parameter; fixed statements are prepared once and reused; sort columns map through a whitelist; `%`/`_` are escaped in `LIKE` searches.
- **Strict validation**: unknown fields are rejected (`{"id": 5}` in a PATCH is a 400, not silently ignored), and `PATCH` needs at least one field. Numbers in URLs are parsed strictly, so one task has exactly one URL.
- **Accurate status codes**: client mistakes are never reported as server errors. An oversized body is a 413 and a non-JSON body a 415, instead of a 500 or a confusing validation message.
- **Indexed list queries**: each sort has an index that matches its `ORDER BY` exactly, so a page is read straight from the index instead of sorting the whole table. `tests/query-plans.test.ts` asks SQLite for each query's plan and fails if one stops using its index. `PRAGMA synchronous = NORMAL` is SQLite's recommended setting with WAL.
- **Stable pagination**: `id` is used as a tie-breaker in every sort; tasks without a due date always sort last.
- **Type-checked tests**: `tsconfig.json` checks `src`, `tests` and `bench`; `tsconfig.build.json` compiles only `src` to `dist/`.

## Performance

`npm run bench` on 200,000 tasks (Apple Silicon laptop; COUNT + one page, median of 7 runs):

| Query                        | Before indexes | Now     |
| ---------------------------- | -------------- | ------- |
| Default list (newest first)  | 65.6 ms        | 0.06 ms |
| `status=todo`                | 23.6 ms        | 0.68 ms |
| `status=todo,in_progress`    | 35.8 ms        | 1.5 ms  |
| `sort=priority`              | 37.0 ms        | 0.06 ms |
| `sort=title`                 | 16.7 ms        | 0.05 ms |
| Deep page (page 5000)        | 275 ms         | 1.2 ms  |
| `priority=high&sort=dueDate` | 29.9 ms        | 31.3 ms |
| Search `q=report`            | 61.3 ms        | 27.2 ms |
| Insert (one per transaction) | 0.04 ms        | 0.05 ms |

This matters more than usual because `better-sqlite3` is synchronous: while a query runs, the server can't handle any other request.

Two queries are deliberately left as they are:

- **Sorting by due date**: "undated tasks last" mixes sort directions, so it needs two more indexes (one per direction). Measured, they nearly double insert cost to make this one query about 2× faster. Worth adding only if due-date sorting becomes a main use case.
- **Search**: `LIKE '%word%'` starts with a wildcard, which no ordinary index can serve, so it always scans the table. The fix is SQLite's full-text search (FTS5), which also changes search from substring to whole-word matching, so it's an API change rather than a tuning step.

## Adding business logic

Business rules go in `TaskService`, never in routes or the repository. For example, _"a completed task can't be reopened"_:

```ts
// src/tasks/task.service.ts
update(id: number, changes: UpdateTaskInput): Task {
  const task = this.get(id); // 404 if missing
  if (task.status === "done" && changes.status === "todo") {
    throw new HttpError(409, "TASK_ALREADY_DONE", "A completed task can't be reopened");
  }
  return orNotFound(this.tasks.update(id, changes, this.now()), `Task ${id}`);
}
```

1. Put the rule in the service method for that use case.
2. Throw an `HttpError` with a specific `code`; the error handler turns it into the response. (In a larger codebase, throw a domain error such as `TaskAlreadyDoneError` and map it to 409 in the error handler, so the service knows nothing about HTTP.)
3. Unit test it in `tests/task.service.test.ts`: plain method calls with a controlled clock, no HTTP.
4. If a use case needs several writes that must succeed or fail together, wrap them in `db.transaction(...)` inside the service.

The route doesn't change, and every caller (API, seed script, a future job) gets the rule automatically.

## Possible improvements

Before running behind a load balancer: set Express's `trust proxy` so `req.ip` is the client rather than the balancer, and raise `server.keepAliveTimeout` above the balancer's idle timeout (Node's 5 s default is shorter than a typical 60 s, which causes sporadic 502s).

Authentication and per-user ownership (then rate limiting per user and a CORS policy for browser clients), an `/api/v1` version prefix, an OpenAPI spec, `PUT` for full replacement, optimistic concurrency (`ETag`/`If-Match`), FTS5 full-text search, cursor (keyset) pagination and an approximate total for very large tables, `pino-pretty` for readable logs in development, and a Dockerfile.
