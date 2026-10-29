import { clsx } from "clsx";
import type { ComponentProps } from "react";

const variantStyles = {
  /** Blends into its surroundings until hovered (close and dismiss buttons). */
  ghost: "rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white",
  /** Sits on top of other content (e.g. the flip button between the two amount fields). */
  solid:
    "rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white",
};

interface IconButtonProps extends Omit<
  ComponentProps<"button">,
  "type" | "aria-label"
> {
  /**
   * Accessible name. Required because an icon-only button has no visible text for
   * screen readers to announce.
   */
  label: string;
  variant?: keyof typeof variantStyles;
}

/** Icon-only action. Pass the icon (marked `aria-hidden`) as children. */
export function IconButton({
  label,
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={clsx(
        "inline-flex items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
