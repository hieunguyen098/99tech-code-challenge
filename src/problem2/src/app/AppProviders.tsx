import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ErrorBoundary } from "../shared/ui/ErrorBoundary";

// Library defaults: failed queries retry 3 times with exponential backoff.
const defaultQueryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
  /** Tests pass their own client (e.g. with retries off) to keep each test isolated. */
  queryClient?: QueryClient;
}

/** App-wide providers, shared by the real entry point and the tests. */
export function AppProviders({
  children,
  queryClient = defaultQueryClient,
}: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
