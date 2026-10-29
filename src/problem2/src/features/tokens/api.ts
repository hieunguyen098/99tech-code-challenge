import { config } from "../../shared/config";
import { parsePriceFeed, type PriceFeedEntry, type Token } from "./tokens";

export async function fetchTokens(signal?: AbortSignal): Promise<Token[]> {
  const response = await fetch(config.pricesUrl, { signal });
  if (!response.ok) {
    throw new Error(`Price feed responded with ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error("Unexpected price feed format");
  return parsePriceFeed(body as PriceFeedEntry[]);
}
