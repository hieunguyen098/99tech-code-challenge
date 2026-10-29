import { useQuery } from "@tanstack/react-query";
import { fetchTokens } from "./api";

export const tokensQueryKey = ["tokens"] as const;

/**
 * Token list with USD prices. Prices are treated as fresh for 30s and refreshed every
 * minute so quotes don't go stale while the page is open; retries come from the
 * QueryClient defaults.
 */
export function useTokens() {
  return useQuery({
    queryKey: tokensQueryKey,
    queryFn: ({ signal }) => fetchTokens(signal),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
