import { useCallback, useState } from "react";
import {
  describeSwapReceipt,
  SwapForm,
  SwapFormSkeleton,
  type SwapReceipt,
} from "../features/swap";
import { useTokens } from "../features/tokens";
import { WalletProvider } from "../features/wallet";
import { ErrorState } from "../shared/ui/ErrorState";
import { Toast } from "../shared/ui/Toast";

export default function App() {
  const prices = useTokens();
  const [receipt, setReceipt] = useState<SwapReceipt | null>(null);
  const dismissToast = useCallback(() => setReceipt(null), []);

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-115">
        <div className="mb-4 flex items-center gap-2 px-1">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            className="size-8"
          />
          <span className="text-lg font-semibold tracking-tight text-white">
            Fancy Swap
          </span>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-4">
          <h1 className="px-1 pt-1 pb-3 text-xl font-semibold text-white">
            Swap
          </h1>

          {/*
           * Once prices have loaded, a failed background refresh keeps the last good prices.
           * Retrying with no data puts the query back to "pending", so the skeleton shows.
           */}
          {prices.data ? (
            <WalletProvider tokens={prices.data}>
              <SwapForm tokens={prices.data} onSwapped={setReceipt} />
            </WalletProvider>
          ) : prices.isError ? (
            <ErrorState
              title="Couldn’t load token prices"
              message={prices.error.message}
              onRetry={() => void prices.refetch()}
            />
          ) : (
            <SwapFormSkeleton />
          )}
        </section>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo only — balances are mocked and swaps are simulated. Prices from
          Switcheo.
        </p>
      </div>

      {receipt && (
        <Toast
          // A new swap remounts the toast so its auto-dismiss timer restarts.
          key={receipt.txHash}
          title="Swap successful"
          description={describeSwapReceipt(receipt)}
          onDismiss={dismissToast}
        />
      )}
    </main>
  );
}
