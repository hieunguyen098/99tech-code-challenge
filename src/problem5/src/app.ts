import express from "express";
import helmet from "helmet";
import type { DB } from "./db/database.js";
import { errorHandler } from "./http/error-handler.js";
import { healthCheck } from "./http/health.js";
import { notFoundHandler } from "./http/not-found.js";
import { requestLogger } from "./http/request-logger.js";
import type { Logger } from "./logger.js";
import { TaskRepository } from "./tasks/task.repository.js";
import { createTaskRouter } from "./tasks/task.routes.js";
import { TaskService, type Clock } from "./tasks/task.service.js";

export interface AppDependencies {
  db: DB;
  logger: Logger;
  /** Defaults to the real time; tests pass a fixed clock. */
  clock?: Clock;
}

/**
 * Builds the Express app from its dependencies, so tests can pass an in-memory database
 * and a silent logger. Middleware order matters: logging first, so every request gets an
 * id; then security headers and JSON parsing; then routes; then 404 and errors.
 */
export function createApp({ db, logger, clock }: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", healthCheck(db));
  const tasks = new TaskService(new TaskRepository(db), clock);
  app.use("/api/tasks", createTaskRouter(tasks));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
