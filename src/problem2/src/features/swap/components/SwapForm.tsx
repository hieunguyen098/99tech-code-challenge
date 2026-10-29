import { useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { IconButton } from "../../../shared/ui/IconButton";
import { SwapVerticalIcon } from "../../../shared/ui/icons";
import type { Token } from "../../tokens";
import type { SwapReceipt } from "../api";
import { issueLabel } from "../model/issueLabel";
import type { Side } from "../model/swapState";
import { useSwap } from "../useSwap";
import { AmountField } from "./AmountField";
import { SwapDetails } from "./SwapDetails";
import { TokenPicker } from "./TokenPicker";

interface SwapFormProps {
  tokens: Token[];
  onSwapped?: (receipt: SwapReceipt) => void;
}

export function SwapForm({ tokens, onSwapped }: SwapFormProps) {
  const swap = useSwap({ tokens, onSwapped });
  const [tokenPickerSide, setTokenPickerSide] = useState<Side | null>(null);
  const { issue, isSubmitting } = swap;

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          swap.submit();
        }}
        noValidate
        className="flex flex-col gap-1"
      >
        <AmountField
          id="input-amount"
          label="You pay"
          value={swap.fromInput}
          token={swap.fromToken}
          balance={swap.fromBalance}
          error={
            issue?.kind === "insufficient-balance"
              ? "Exceeds balance"
              : undefined
          }
          disabled={isSubmitting}
          onChange={(value) => swap.setInput("from", value)}
          onSelectToken={() => setTokenPickerSide("from")}
          onMax={swap.setMaxAmount}
        />

        <div className="relative z-10 -my-4 flex justify-center">
          <IconButton
            label="Switch tokens"
            variant="solid"
            onClick={swap.flipTokens}
            disabled={isSubmitting}
            // The thick border in the card colour "cuts" the button into both fields.
            className="group border-4 border-slate-900"
          >
            <SwapVerticalIcon className="size-5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-180" />
          </IconButton>
        </div>

        <AmountField
          id="output-amount"
          label="You receive"
          value={swap.toInput}
          token={swap.toToken}
          balance={swap.toBalance}
          disabled={isSubmitting}
          onChange={(value) => swap.setInput("to", value)}
          onSelectToken={() => setTokenPickerSide("to")}
        />

        {swap.fromToken && swap.toToken && (
          <SwapDetails fromToken={swap.fromToken} toToken={swap.toToken} />
        )}

        <Button
          type="submit"
          variant="cta"
          size="lg"
          disabled={Boolean(issue)}
          loading={isSubmitting}
          className="mt-2"
        >
          {isSubmitting
            ? "Swapping…"
            : issue
              ? issueLabel(issue)
              : "Confirm swap"}
        </Button>

        {swap.hasSubmitError && (
          <p role="alert" className="mt-1 text-center text-sm text-rose-400">
            Swap failed. Please try again.
          </p>
        )}
      </form>

      {/* Outside the <form>: pressing Enter in the token search must never submit the swap. */}
      <TokenPicker
        open={tokenPickerSide !== null}
        tokens={swap.tokens}
        balances={swap.balances}
        selectedSymbol={
          tokenPickerSide === "from"
            ? swap.fromToken?.symbol
            : swap.toToken?.symbol
        }
        onSelect={(symbol) => {
          if (tokenPickerSide) swap.selectToken(tokenPickerSide, symbol);
          setTokenPickerSide(null);
        }}
        onClose={() => setTokenPickerSide(null)}
      />
    </>
  );
}
