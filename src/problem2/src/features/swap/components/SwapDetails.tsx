import { useState } from "react";
import { formatPrice } from "../../../shared/lib/format";
import { SwapHorizontalIcon } from "../../../shared/ui/icons";
import type { Token } from "../../tokens";
import { describeRate } from "../model/rate";

interface SwapDetailsProps {
  fromToken: Token;
  toToken: Token;
}

export function SwapDetails({ fromToken, toToken }: SwapDetailsProps) {
  const [inverted, setInverted] = useState(false);
  const [base, quote] = inverted ? [toToken, fromToken] : [fromToken, toToken];

  return (
    <dl className="mt-2 flex flex-col gap-1.5 px-1 py-2 text-sm text-slate-400">
      <div className="flex items-center justify-between gap-2">
        <dt>Rate</dt>
        <dd>
          <button
            type="button"
            onClick={() => setInverted((value) => !value)}
            className="group inline-flex items-center gap-1.5 rounded-md text-right text-slate-200 tabular-nums transition hover:text-white"
          >
            <span>
              {describeRate(base, quote)}{" "}
              <span className="text-slate-500">
                ({formatPrice(base.price)})
              </span>
            </span>
            {/* The icon shows the rate can be flipped; the hidden text says so to screen readers.
                The leading ", " matters: without it the name runs on as "($0.004)Invert rate". */}
            <SwapHorizontalIcon className="size-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-white" />
            <span className="sr-only">, invert rate</span>
          </button>
        </dd>
      </div>
      <div className="flex items-center justify-between">
        <dt>Network fee</dt>
        <dd className="text-emerald-400">Free (demo)</dd>
      </div>
    </dl>
  );
}
