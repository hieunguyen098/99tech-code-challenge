export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

/**
 * Returns the result of a lookup, or turns "nothing there" (`null`, or `false` from a
 * delete) into a 404, so each route doesn't repeat the check.
 *
 * @example orNotFound(tasks.findById(id), `Task ${id}`) // 404 "Task 7 not found"
 */
export function orNotFound<T>(result: T | null | false, what: string): T {
  if (result === null || result === false) {
    throw new NotFoundError(`${what} not found`);
  }
  return result;
}
