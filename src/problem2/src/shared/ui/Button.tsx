import { clsx } from "clsx";
import type { ComponentProps } from "react";
import { Spinner } from "./Spinner";

/*
 * Buttons in this app:
 * - `Button` for text actions, `IconButton` for icon-only actions.
 * - A raw <button> is fine for a one-off composite control (e.g. a token list row or
 *   the token selector pill), as long as it has a `type` (lint enforces it) and an
 *   accessible name.
 */

type ButtonState = "enabled" | "loading" | "disabled";

const variantStyles: Record<"primary" | "cta", Record<ButtonState, string>> = {
  primary: {
    enabled: "bg-violet-500 text-white hover:bg-violet-400",
    loading: "bg-violet-500 text-white",
    disabled: "bg-violet-500 text-white opacity-60",
  },
  // The main action of a screen. Its disabled look is muted rather than faded, so the
  // label (which explains what is missing, e.g. "Enter an amount") stays readable.
  cta: {
    enabled:
      "bg-linear-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:brightness-110 motion-safe:active:scale-[0.99]",
    loading:
      "bg-linear-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/20",
    disabled: "bg-slate-700 text-slate-400",
  },
};

const sizeStyles = {
  md: "rounded-xl px-4 py-2 text-sm",
  lg: "h-14 rounded-2xl px-6 text-lg",
};

interface ButtonProps extends Omit<ComponentProps<"button">, "type"> {
  /** Defaults to "button" so a Button never submits a form by accident. */
  type?: "button" | "submit";
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  /**
   * Shows a spinner and blocks clicks, but keeps the enabled look: "in progress" must
   * not read as "unavailable".
   */
  loading?: boolean;
}

export function Button({
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const state: ButtonState = loading
    ? "loading"
    : disabled
      ? "disabled"
      : "enabled";

  return (
    <button
      // Literal values so the `react/button-has-type` lint rule can verify them.
      type={type === "submit" ? "submit" : "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-semibold transition",
        sizeStyles[size],
        variantStyles[variant][state],
        state === "loading" && "cursor-wait",
        state === "disabled" && "cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {loading && <Spinner className={size === "lg" ? "size-5" : "size-4"} />}
      {children}
    </button>
  );
}
