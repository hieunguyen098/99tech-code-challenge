import { Button } from "./Button";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

/** Inline error for content that failed to load, with an optional retry. */
export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl bg-slate-800/60 px-6 py-10 text-center"
    >
      <p className="font-medium text-white">{title}</p>
      <p className="text-sm text-slate-400">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
