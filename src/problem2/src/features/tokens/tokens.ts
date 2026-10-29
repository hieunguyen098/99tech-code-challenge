const ICON_BASE_URL =
  "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens";

// The icon repo is case-sensitive and a few symbols are cased differently from the price feed.
const ICON_NAME_OVERRIDES: Record<string, string> = {
  RATOM: "rATOM",
  STATOM: "stATOM",
  STEVMOS: "stEVMOS",
  STLUNA: "stLUNA",
  STOSMO: "stOSMO",
};

/** One row of the price feed. */
export interface PriceFeedEntry {
  currency: string;
  date: string;
  price: number;
}

export interface Token {
  symbol: string;
  /** Price in USD. */
  price: number;
  updatedAt: string;
  iconUrl: string;
}

export function iconUrlFor(symbol: string): string {
  return `${ICON_BASE_URL}/${ICON_NAME_OVERRIDES[symbol] ?? symbol}.svg`;
}

/** Timestamp for ordering entries; a missing or invalid date counts as the oldest. */
function entryTime(entry: PriceFeedEntry): number {
  const time = Date.parse(entry.date);
  return Number.isNaN(time) ? -Infinity : time;
}

/**
 * The feed can contain several entries for one currency; keep the most recent one and
 * drop tokens without a usable price (they cannot be converted).
 */
export function parsePriceFeed(entries: PriceFeedEntry[]): Token[] {
  const latest = new Map<string, PriceFeedEntry>();
  for (const entry of entries) {
    if (!entry?.currency || !Number.isFinite(entry.price) || entry.price <= 0) {
      continue;
    }
    const previous = latest.get(entry.currency);
    if (!previous || entryTime(entry) >= entryTime(previous)) {
      latest.set(entry.currency, entry);
    }
  }

  return [...latest.values()]
    .map((entry) => ({
      symbol: entry.currency,
      price: entry.price,
      updatedAt: entry.date,
      iconUrl: iconUrlFor(entry.currency),
    }))
    .sort((a, b) =>
      a.symbol.localeCompare(b.symbol, "en", { sensitivity: "base" }),
    );
}

/**
 * Filters tokens by symbol and orders matches: exact first, then prefix, then substring,
 * so that "swth" ranks SWTH above rSWTH.
 */
export function searchTokens(tokens: Token[], query: string): Token[] {
  const q = query.trim().toLowerCase();
  if (!q) return tokens;
  const rank = (symbol: string) =>
    symbol === q ? 0 : symbol.startsWith(q) ? 1 : 2;
  return tokens
    .filter((t) => t.symbol.toLowerCase().includes(q))
    .sort(
      (a, b) => rank(a.symbol.toLowerCase()) - rank(b.symbol.toLowerCase()),
    );
}

/** Converts an amount of one token into another through their USD prices. */
export function convertAmount(
  amount: number,
  fromToken: Token,
  toToken: Token,
): number {
  return (amount * fromToken.price) / toToken.price;
}
