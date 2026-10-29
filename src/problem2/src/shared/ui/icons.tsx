/*
 * The app's icon set. Icons are decorative (`aria-hidden`): the control around them
 * provides the accessible name. Callers set the size (and any colour/animation) via
 * `className`; strokes and fills use `currentColor`.
 */

interface IconProps {
  className?: string;
}

/** × for close and dismiss buttons. */
export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

/** ⌄ for controls that open a list. */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
    </svg>
  );
}

/** ✓ for success. */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
    </svg>
  );
}

/** ⇅ for swapping two things vertically. */
export function SwapVerticalIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  );
}

/** ⇄ for reversing a direction (e.g. inverting an exchange rate). */
export function SwapHorizontalIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16M20 7l-3-3M20 7l-3 3M20 17H4M4 17l3-3M4 17l3 3" />
    </svg>
  );
}
