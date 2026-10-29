import { clsx } from "clsx";
import { ChevronDownIcon } from "../../../shared/ui/icons";
import { TokenIcon, type Token } from "../../tokens";

interface TokenSelectButtonProps {
  token: Token | null;
  /** The amount field's label, used in the accessible name, e.g. "You pay: USDC". */
  fieldLabel: string;
  disabled?: boolean;
  onClick: () => void;
}

/** Opens the token picker for one amount field: shows the chosen token, or a prompt. */
export function TokenSelectButton({
  token,
  fieldLabel,
  disabled,
  onClick,
}: TokenSelectButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-label={`${fieldLabel}: ${token ? token.symbol : "select token"}`}
      className={clsx(
        "flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3 font-semibold text-white transition disabled:opacity-60",
        token
          ? "bg-slate-700/80 pl-1.5 hover:bg-slate-700"
          : "bg-violet-500 pl-4 hover:bg-violet-400",
      )}
    >
      {/* Keyed so a failed icon's fallback state doesn't stick to the next token picked. */}
      {token && <TokenIcon key={token.symbol} token={token} />}
      <span>{token ? token.symbol : "Select token"}</span>
      <ChevronDownIcon className="size-4 opacity-70" />
    </button>
  );
}
