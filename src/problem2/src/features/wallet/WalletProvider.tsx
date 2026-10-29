import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Token } from "../tokens";
import {
  applyBalanceChanges,
  createMockBalances,
  withMockBalancesFor,
  type BalanceChange,
} from "./balances";
import { WalletContext, type WalletContextValue } from "./WalletContext";

interface WalletProviderProps {
  tokens: Token[];
  children: ReactNode;
}

/**
 * Mock wallet, seeded from the price list. In a real app this is where a wallet connector
 * would supply balances; consumers only depend on `useWallet()`.
 */
export function WalletProvider({ tokens, children }: WalletProviderProps) {
  const [storedBalances, setStoredBalances] = useState(() =>
    createMockBalances(tokens),
  );

  // A price refresh can add tokens. Their mock balances are derived during render rather
  // than copied into state from an effect: mock balances are deterministic, so this
  // gives the same result every time, and it returns `storedBalances` itself (no new
  // object) when no token is new.
  const balances = useMemo(
    () => withMockBalancesFor(storedBalances, tokens),
    [storedBalances, tokens],
  );

  const updateBalances = useCallback(
    (changes: BalanceChange[]) => {
      setStoredBalances((previous) =>
        applyBalanceChanges(withMockBalancesFor(previous, tokens), changes),
      );
    },
    [tokens],
  );

  const value = useMemo<WalletContextValue>(
    () => ({ balances, updateBalances }),
    [balances, updateBalances],
  );

  return <WalletContext value={value}>{children}</WalletContext>;
}
