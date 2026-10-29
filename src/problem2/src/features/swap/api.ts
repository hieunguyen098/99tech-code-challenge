import { config } from "../../shared/config";

export interface SwapRequest {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
}

export interface SubmitSwapResponse {
  txHash: string;
}

/** A completed swap: what was submitted plus what the endpoint returned. */
export type SwapReceipt = SwapRequest & SubmitSwapResponse;

function randomTxHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Mocked swap endpoint: resolves after a network-like delay. Swap this for a real
 * `fetch` call; the rest of the app only depends on this signature.
 */
export function submitSwap(_request: SwapRequest): Promise<SubmitSwapResponse> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ txHash: randomTxHash() }),
      config.mockSwapDelayMs,
    );
  });
}
