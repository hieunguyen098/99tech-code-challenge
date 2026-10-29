import { orNotFound } from "../http/errors.js";
import type { TaskRepository } from "./task.repository.js";
import type {
  CreateTaskInput,
  ListTasksQuery,
  Task,
  UpdateTaskInput,
} from "./task.schema.js";

/** Returns the current time; injected so tests can control it. */
export type Clock = () => Date;

/**
 * The tasks use cases, and the home of every business rule about tasks.
 *
 * Routes only translate HTTP to and from these methods, and the repository only runs
 * SQL; anything that *decides* something lives here. Today that is "the task must
 * exist" and "what time it is". A future rule (say, "a done task can't go back to
 * todo") goes into the matching method, with a unit test in task.service.test.ts —
 * routes and repository don't change.
 */
export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  create(input: CreateTaskInput): Task {
    return this.tasks.create(input, this.now());
  }

  list(query: ListTasksQuery): { items: Task[]; total: number } {
    return this.tasks.list(query);
  }

  get(id: number): Task {
    return orNotFound(this.tasks.findById(id), `Task ${id}`);
  }

  update(id: number, changes: UpdateTaskInput): Task {
    return orNotFound(this.tasks.update(id, changes, this.now()), `Task ${id}`);
  }

  delete(id: number): void {
    orNotFound(this.tasks.delete(id), `Task ${id}`);
  }

  private now(): string {
    return this.clock().toISOString();
  }
}
