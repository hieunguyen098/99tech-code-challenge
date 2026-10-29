import { z } from "zod";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "dueDate",
  "priority",
  "title",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const title = z.string().trim().min(1, "Title is required").max(200);
const description = z.string().trim().max(2000);
const dueDate = z.iso.date("Expected a date in YYYY-MM-DD format").nullable();

export const createTaskSchema = z.strictObject({
  title,
  description: description.default(""),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  dueDate: dueDate.default(null),
});

export const updateTaskSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: dueDate.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  });

/**
 * A positive whole number written plainly: "12", but not "1e1", "0x0c", "12.0" or " 12".
 * `z.coerce.number()` accepted all of those, so one task answered to many URLs.
 */
const positiveInt = z
  .string()
  .regex(/^[1-9]\d*$/, "Expected a positive whole number")
  .transform(Number)
  .refine(Number.isSafeInteger, "Number is too large");

/** Accepts `?status=todo,done` or `?status=todo&status=done`. */
const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      (Array.isArray(value) ? value : value.split(","))
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values)).min(1))
    .optional();

export const listTasksQuerySchema = z
  .object({
    status: csvEnum(TASK_STATUSES),
    priority: csvEnum(TASK_PRIORITIES),
    q: z.string().trim().min(1).max(200).optional(),
    dueBefore: z.iso.date().optional(),
    dueAfter: z.iso.date().optional(),
    sort: z.enum(SORT_FIELDS).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: positiveInt.default(1),
    limit: positiveInt.pipe(z.number().max(100)).default(20),
  })
  .refine((q) => !q.dueAfter || !q.dueBefore || q.dueAfter <= q.dueBefore, {
    message: "dueAfter must be on or before dueBefore",
    path: ["dueAfter"],
  });

/** Route params. Parsed as an object so a bad id is reported with `path: "id"`. */
export const taskParamsSchema = z.object({ id: positiveInt });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
