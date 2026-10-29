import { Router } from "express";
import { methodNotAllowed } from "../http/method-not-allowed.js";
import { paginationMeta } from "../http/pagination.js";
import { requireJsonBody } from "../http/require-json-body.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskParamsSchema,
  updateTaskSchema,
} from "./task.schema.js";
import type { TaskService } from "./task.service.js";

/**
 * HTTP only: each handler parses its input, makes one service call and sends the
 * response. Decisions belong in TaskService; errors are thrown and shaped by the
 * central error handler.
 */
export function createTaskRouter(tasks: TaskService): Router {
  const router = Router();

  // Only routes that take a body check its content type, so unknown routes still 404.
  router.post("/", requireJsonBody, (req, res) => {
    // Express 5 leaves req.body undefined without a body; {} gives field-level errors.
    const task = tasks.create(createTaskSchema.parse(req.body ?? {}));
    res.status(201).location(`${req.baseUrl}/${task.id}`).json({ data: task });
  });

  router.get("/", (req, res) => {
    const query = listTasksQuerySchema.parse(req.query);
    const { items, total } = tasks.list(query);
    res.json({ data: items, meta: paginationMeta(query, total) });
  });

  router.get("/:id", (req, res) => {
    const { id } = taskParamsSchema.parse(req.params);
    res.json({ data: tasks.get(id) });
  });

  router.patch("/:id", requireJsonBody, (req, res) => {
    const { id } = taskParamsSchema.parse(req.params);
    const changes = updateTaskSchema.parse(req.body ?? {});
    res.json({ data: tasks.update(id, changes) });
  });

  router.delete("/:id", (req, res) => {
    tasks.delete(taskParamsSchema.parse(req.params).id);
    res.status(204).end();
  });

  // Registered last, so they only catch methods none of the routes above handle.
  router.all("/", methodNotAllowed(["GET", "POST"]));
  router.all("/:id", methodNotAllowed(["GET", "PATCH", "DELETE"]));

  return router;
}
