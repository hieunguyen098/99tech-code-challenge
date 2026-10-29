import { useMutation } from "@tanstack/react-query";
import { useMemo, useReducer } from "react";
import { formatForInput, parseAmount } from "../../shared/lib/amount";
import type { Token } from "../tokens";
import { useWallet, type BalanceChange } from "../wallet";
import { submitSwap, type SwapReceipt, type SwapRequest } from "./api";
import {
  createInitialSwapState,
  deriveInputs,
  swapReducer,
  type Side,
  type SwapAction,
} from "./model/swapState";
import { validateSwap } from "./model/validation";

/** A swap seen from the wallet: debit what was paid, credit what was received. */
function toBalanceChanges(swap: SwapRequest): BalanceChange[] {
  return [
    { symbol: swap.fromSymbol, delta: -swap.fromAmount },
    { symbol: swap.toSymbol, delta: swap.toAmount },
  ];
}

interface UseSwapOptions {
  tokens: Token[];
  onSwapped?: (receipt: SwapReceipt) => void;
}

/**
 * Everything the swap form needs: selected tokens, both amounts, balances, the current
 * validation issue and the actions that change them. Components only render this.
 */
export function useSwap({ tokens, onSwapped }: UseSwapOptions) {
  const [state, dispatch] = useReducer(
    swapReducer,
    tokens,
    createInitialSwapState,
  );
  const { balances, updateBalances } = useWallet();

  const bySymbol = useMemo(
    () => new Map(tokens.map((t) => [t.symbol, t])),
    [tokens],
  );
  const fromToken = state.fromSymbol
    ? (bySymbol.get(state.fromSymbol) ?? null)
    : null;
  const toToken = state.toSymbol
    ? (bySymbol.get(state.toSymbol) ?? null)
    : null;

  const { fromInput, toInput } = deriveInputs(state, fromToken, toToken);
  const fromAmount = parseAmount(fromInput);
  const toAmount = parseAmount(toInput);
  const fromBalance = fromToken ? (balances[fromToken.symbol] ?? 0) : 0;
  const toBalance = toToken ? (balances[toToken.symbol] ?? 0) : 0;

  const issue = validateSwap({
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    balance: fromBalance,
  });

  const mutation = useMutation({
    mutationFn: submitSwap,
    // `request` is the snapshot that was submitted, not whatever the form shows now.
    onSuccess: (result, request) => {
      updateBalances(toBalanceChanges(request));
      dispatch({ type: "inputCleared" });
      onSwapped?.({ ...request, ...result });
    },
  });

  /** Applies a user edit; any edit makes a previous "Swap failed" error out of date. */
  function edit(action: SwapAction) {
    mutation.reset();
    dispatch(action);
  }

  function setInput(side: Side, value: string) {
    edit({ type: "inputChanged", side, value });
  }

  function submit() {
    if (issue || !fromToken || !toToken || mutation.isPending) return;
    mutation.mutate({
      fromSymbol: fromToken.symbol,
      toSymbol: toToken.symbol,
      fromAmount,
      toAmount,
    });
  }

  return {
    tokens,
    balances,
    fromToken,
    toToken,
    fromInput,
    toInput,
    fromBalance,
    toBalance,
    issue,
    isSubmitting: mutation.isPending,
    hasSubmitError: mutation.isError,
    setInput,
    // Rounded down: MAX must never ask for more than the balance.
    setMaxAmount: () => setInput("from", formatForInput(fromBalance, "down")),
    flipTokens: () => edit({ type: "tokensFlipped" }),
    selectToken: (side: Side, symbol: string) =>
      edit({ type: "tokenSelected", side, symbol }),
    submit,
  };
}
