import {
  createTaskSchema,
  listTasksQuerySchema,
} from "../tasks/task.schema.js";
import type { TaskService } from "../tasks/task.service.js";

const SAMPLE_TASKS = [
  {
    title: "Set up CI pipeline",
    status: "done",
    priority: "high",
    dueDate: "2026-10-01",
  },
  {
    title: "Write API documentation",
    description: "Cover every endpoint in the README",
    status: "in_progress",
    priority: "medium",
    dueDate: "2026-11-05",
  },
  { title: "Add pagination to task list", status: "done", priority: "medium" },
  {
    title: "Fix flaky integration test",
    priority: "high",
    dueDate: "2026-11-01",
  },
  { title: "Upgrade dependencies", priority: "low", dueDate: "2026-12-15" },
  {
    title: "Design score board UI",
    description: "Live top-10 leaderboard",
    status: "in_progress",
    priority: "high",
  },
];

/**
 * Inserts the sample tasks into an empty database and returns how many were added.
 * Safe to run again: a database that already has tasks is left untouched (running the
 * seed twice used to duplicate every sample task).
 */
export function seedSampleTasks(tasks: TaskService): number {
  const { total } = tasks.list(listTasksQuerySchema.parse({}));
  if (total > 0) return 0;
  // Through the service, so seeded tasks follow the same rules as API-created ones.
  for (const sample of SAMPLE_TASKS)
    tasks.create(createTaskSchema.parse(sample));
  return SAMPLE_TASKS.length;
}
