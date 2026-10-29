import { clsx } from "clsx";
import { useState } from "react";
import type { Token } from "./tokens";

const FALLBACK_COLORS = [
  "bg-violet-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

interface TokenIconProps {
  token: Token;
  size?: number;
}

export function TokenIcon({ token, size = 28 }: TokenIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const color =
      FALLBACK_COLORS[token.symbol.charCodeAt(0) % FALLBACK_COLORS.length];
    return (
      <span
        aria-hidden
        className={clsx(
          color,
          "inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
        )}
        style={{ width: size, height: size }}
      >
        {token.symbol.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={token.iconUrl}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-white/5"
    />
  );
}
