import { createContext, useContext } from "react";
import type { BalanceChange, Balances } from "./balances";

export interface WalletContextValue {
  balances: Balances;
  updateBalances: (changes: BalanceChange[]) => void;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const wallet = useContext(WalletContext);
  if (!wallet) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return wallet;
}
