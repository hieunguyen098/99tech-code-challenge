import { formatForInput, parseAmount } from "../../../shared/lib/amount";
import { convertAmount, type Token } from "../../tokens";

export type Side = "from" | "to";

export interface SwapState {
  fromSymbol: string | null;
  toSymbol: string | null;
  /**
   * What the user typed, and in which field. Only this is stored; the other field is
   * derived from prices, so the two can never disagree.
   */
  input: string;
  inputSide: Side;
}

export type SwapAction =
  | { type: "inputChanged"; side: Side; value: string }
  | { type: "tokensFlipped" }
  | { type: "tokenSelected"; side: Side; symbol: string }
  | { type: "inputCleared" };

const DEFAULT_FROM_SYMBOL = "USDC";
const DEFAULT_TO_SYMBOL = "ETH";

function pickDefault(
  tokens: Token[],
  preferred: string,
  exclude: string | null,
): string | null {
  const candidates = tokens.filter((t) => t.symbol !== exclude);
  return (
    candidates.find((t) => t.symbol === preferred)?.symbol ??
    candidates[0]?.symbol ??
    null
  );
}

export function createInitialSwapState(tokens: Token[]): SwapState {
  const fromSymbol = pickDefault(tokens, DEFAULT_FROM_SYMBOL, null);
  return {
    fromSymbol,
    toSymbol: pickDefault(tokens, DEFAULT_TO_SYMBOL, fromSymbol),
    input: "",
    inputSide: "from",
  };
}

export function swapReducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case "inputChanged":
      return { ...state, input: action.value, inputSide: action.side };

    case "tokensFlipped":
      // The typed number stays attached to the token it was typed for.
      return {
        ...state,
        fromSymbol: state.toSymbol,
        toSymbol: state.fromSymbol,
        inputSide: state.inputSide === "from" ? "to" : "from",
      };

    case "tokenSelected": {
      const other = action.side === "from" ? state.toSymbol : state.fromSymbol;
      // Picking the token already on the other side swaps the two.
      if (action.symbol === other) {
        return swapReducer(state, { type: "tokensFlipped" });
      }
      return action.side === "from"
        ? { ...state, fromSymbol: action.symbol }
        : { ...state, toSymbol: action.symbol };
    }

    case "inputCleared":
      return { ...state, input: "" };
  }
}

/**
 * Both field values: the typed one as-is, the other converted through USD prices.
 * The converted side rounds against the user: what they receive rounds down, what they
 * pay rounds up, so rounding never hands out more than the payment is worth.
 */
export function deriveInputs(
  state: SwapState,
  fromToken: Token | null,
  toToken: Token | null,
): { fromInput: string; toInput: string } {
  let derived = "";
  if (fromToken && toToken) {
    const typedPay = state.inputSide === "from";
    const [source, target] = typedPay
      ? [fromToken, toToken]
      : [toToken, fromToken];
    derived = formatForInput(
      convertAmount(parseAmount(state.input), source, target),
      typedPay ? "down" : "up",
    );
  }
  return state.inputSide === "from"
    ? { fromInput: state.input, toInput: derived }
    : { fromInput: derived, toInput: state.input };
}
