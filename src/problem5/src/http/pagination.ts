export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** The `meta` block of a paginated list response, shared by every list endpoint. */
export function paginationMeta(
  { page, limit }: { page: number; limit: number },
  total: number,
): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
