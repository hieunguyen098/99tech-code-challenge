import { describe, expect, it } from "vitest";
import { NotFoundError, orNotFound } from "../src/http/errors.js";
import { paginationMeta } from "../src/http/pagination.js";

describe("orNotFound", () => {
  it("returns a found value unchanged", () => {
    const task = { id: 7 };
    expect(orNotFound(task, "Task 7")).toBe(task);
    expect(orNotFound(true, "Task 7")).toBe(true);
  });

  it.each([null, false] as const)(
    "turns %s into a 404 naming what was missing",
    (missing) => {
      expect(() => orNotFound(missing, "Task 7")).toThrow(
        new NotFoundError("Task 7 not found"),
      );
    },
  );

  it("treats falsy but real values like 0 or an empty string as found", () => {
    expect(orNotFound(0, "Count")).toBe(0);
    expect(orNotFound("", "Name")).toBe("");
  });
});

describe("paginationMeta", () => {
  it("rounds partial pages up", () => {
    expect(paginationMeta({ page: 2, limit: 3 }, 4)).toEqual({
      page: 2,
      limit: 3,
      total: 4,
      totalPages: 2,
    });
  });

  it("reports zero pages for an empty list", () => {
    expect(paginationMeta({ page: 1, limit: 20 }, 0).totalPages).toBe(0);
  });
});
