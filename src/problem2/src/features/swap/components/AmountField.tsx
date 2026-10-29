import { clsx } from "clsx";
import { parseAmount, sanitizeAmountInput } from "../../../shared/lib/amount";
import { formatAmount, formatUsd } from "../../../shared/lib/format";
import type { Token } from "../../tokens";
import { TokenSelectButton } from "./TokenSelectButton";

interface AmountFieldProps {
  id: string;
  label: string;
  value: string;
  token: Token | null;
  balance: number;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSelectToken: () => void;
  onMax?: () => void;
}

/** Shrinks long numbers so they stay readable next to the token button on narrow screens. */
function amountTextSize(length: number): string {
  if (length > 15) return "text-lg";
  if (length > 12) return "text-xl";
  if (length > 9) return "text-2xl";
  return "text-3xl";
}

export function AmountField({
  id,
  label,
  value,
  token,
  balance,
  error,
  disabled,
  onChange,
  onSelectToken,
  onMax,
}: AmountFieldProps) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const usdValue = token ? parseAmount(value) * token.price : 0;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={clsx(
        "rounded-2xl border bg-slate-800/60 p-4 transition focus-within:bg-slate-800",
        error
          ? "border-rose-500/70"
          : "border-white/5 focus-within:border-violet-400/60",
      )}
    >
      <div className="flex items-center justify-between text-sm text-slate-400">
        <label id={labelId} htmlFor={id}>
          {label}
        </label>
        {token && (
          <span className="flex items-center gap-2">
            <span>
              Balance:{" "}
              <span className="text-slate-300 tabular-nums">
                {formatAmount(balance)}
              </span>
            </span>
            {onMax && balance > 0 && (
              <button
                type="button"
                onClick={onMax}
                disabled={disabled}
                className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/30 disabled:opacity-50"
              >
                MAX
              </button>
            )}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            const next = sanitizeAmountInput(event.target.value);
            if (next !== null) onChange(next);
          }}
          className={clsx(
            amountTextSize(value.length),
            "h-10 min-w-0 flex-1 bg-transparent font-medium text-white tabular-nums outline-none placeholder:text-slate-600 disabled:opacity-60",
          )}
        />
        <TokenSelectButton
          token={token}
          fieldLabel={label}
          disabled={disabled}
          onClick={onSelectToken}
        />
      </div>

      <div className="mt-1 flex min-h-5 items-center justify-between text-sm">
        <span className="text-slate-500 tabular-nums">
          {usdValue > 0 ? formatUsd(usdValue) : " "}
        </span>
        {error && (
          <span id={errorId} role="alert" className="text-rose-400">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
