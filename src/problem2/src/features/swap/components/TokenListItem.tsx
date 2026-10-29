import { clsx } from "clsx";
import {
  formatAmount,
  formatPrice,
  formatUsd,
} from "../../../shared/lib/format";
import { TokenIcon, type Token } from "../../tokens";

interface TokenListItemProps {
  /** Element id, referenced by the search box's `aria-activedescendant`. */
  id: string;
  token: Token;
  balance: number;
  /** Highlighted by ↓/↑ or the pointer; Enter in the search box picks it. */
  active: boolean;
  /** The token already chosen for this side of the swap. */
  current: boolean;
  onSelect: (symbol: string) => void;
  onPointerActivate: () => void;
}

/**
 * One option in the token picker: icon, symbol and price on the left; balance and its
 * USD value on the right. Not focusable: focus stays in the search box (combobox
 * pattern), which moves the active option with the arrow keys.
 */
export function TokenListItem({
  id,
  token,
  balance,
  active,
  current,
  onSelect,
  onPointerActivate,
}: TokenListItemProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      aria-current={current || undefined}
      onClick={() => onSelect(token.symbol)}
      // Mouse *movement*, not mouseenter: keyboard scrolling slides rows under a still
      // pointer, which fires mouseenter and would steal the highlight.
      onMouseMove={active ? undefined : onPointerActivate}
      className={clsx(
        "flex cursor-pointer items-center gap-3 px-5 py-2.5 transition",
        active ? "bg-white/10" : current && "bg-violet-500/10",
      )}
    >
      <TokenIcon token={token} size={36} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{token.symbol}</span>
        <span className="text-xs text-slate-400">
          {formatPrice(token.price)}
        </span>
      </span>
      <span className="flex flex-col items-end text-sm">
        <span className="tabular-nums">{formatAmount(balance)}</span>
        <span className="text-xs text-slate-400 tabular-nums">
          {formatUsd(balance * token.price)}
        </span>
      </span>
    </li>
  );
}
