import { useEffect } from "react";
import { IconButton } from "./IconButton";
import { CheckIcon, CloseIcon } from "./icons";

const AUTO_DISMISS_MS = 6000;

interface ToastProps {
  title: string;
  description: string;
  onDismiss: () => void;
}

export function Toast({ title, description, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="toast-enter fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur sm:right-6 sm:bottom-6 sm:left-auto"
    >
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <CheckIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm break-words text-slate-400">
          {description}
        </p>
      </div>
      {/* Negative margin keeps the icon where it was; the padding just enlarges the target. */}
      <IconButton label="Dismiss" onClick={onDismiss} className="-m-1.5">
        <CloseIcon className="size-4" />
      </IconButton>
    </div>
  );
}
