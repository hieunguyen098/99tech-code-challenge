import { clsx } from "clsx";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { IconButton } from "./IconButton";
import { CloseIcon } from "./icons";

interface DialogProps {
  open: boolean;
  title: string;
  /**
   * Called once each time the dialog closes, however it closes: Escape, a backdrop
   * click, the close button, or `open` becoming false.
   */
  onClose: () => void;
  /** Element to focus when the dialog opens; defaults to its first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

/**
 * Modal built on the native <dialog>: the browser provides the focus trap, Escape
 * handling and backdrop; this component keeps it in sync with React state and gives
 * every modal the same header.
 */
export function Dialog({
  open,
  title,
  onClose,
  initialFocusRef,
  className,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // The native "close" event fires for every way of closing, so this is the only
      // place `onClose` is called.
      onClose={onClose}
      // A press on the <dialog> element itself, not its content, is on the backdrop. Both
      // ends of the press must be there: a drag from the search box that ends outside
      // the panel also fires `click` on the <dialog>, and must not close it.
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (
          pressStartedOnBackdrop.current &&
          event.target === event.currentTarget
        ) {
          event.currentTarget.close();
        }
        pressStartedOnBackdrop.current = false;
      }}
      className={clsx(
        "m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <IconButton label="Close" onClick={() => dialogRef.current?.close()}>
          <CloseIcon className="size-5" />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
