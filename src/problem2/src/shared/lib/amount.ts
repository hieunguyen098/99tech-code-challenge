/** Precision accepted by amount inputs and kept for balances. */
export const MAX_DECIMALS = 8;

/** A trillion units is far beyond any real balance. */
export const MAX_WHOLE_DIGITS = 12;

/**
 * The most significant digits a JS number (an IEEE-754 double) holds exactly: any
 * decimal with up to 15 of them survives text → number → text unchanged. Typed amounts
 * are capped here so the amount submitted is exactly the amount the user typed.
 */
export const MAX_SIGNIFICANT_DIGITS = 15;

/**
 * Direction for rounding an amount to input precision. Money rounds against the user:
 * an amount they *receive* rounds down, an amount they *pay* rounds up, so rounding
 * never gives them more than the conversion is worth.
 */
export type Rounding = "nearest" | "down" | "up";

function inputFormatter(
  roundingMode: Intl.NumberFormatOptions["roundingMode"],
) {
  return new Intl.NumberFormat("en-US", {
    useGrouping: false, // never "1,000": inputs and Number() need plain digits
    maximumFractionDigits: MAX_DECIMALS,
    maximumSignificantDigits: MAX_SIGNIFICANT_DIGITS,
    roundingPriority: "lessPrecision", // whichever limit allows fewer digits wins
    roundingMode,
  });
}

// Amounts are always positive here, so "trunc" rounds down and "expand" rounds up.
const inputFormatters: Record<Rounding, Intl.NumberFormat> = {
  nearest: inputFormatter("halfExpand"),
  down: inputFormatter("trunc"),
  up: inputFormatter("expand"),
};

/**
 * Removes floating point noise. Past 15 significant digits a double holds arithmetic
 * noise (0.1 + 0.2 = 0.30000000000000004), and directed rounding would turn that noise
 * into a whole unit: rounding up gives 0.30000001, and 4.35 * 100 =
 * 434.99999999999994 rounded down gives 434.99999999. Call this before rounding.
 */
export function withoutFloatNoise(value: number): number {
  return Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS));
}

/** Number of significant digits in a plain decimal string ("0.0012300" → 3). */
function significantDigits(value: string): number {
  return value.replace(".", "").replace(/^0+/, "").replace(/0+$/, "").length;
}

/**
 * Cleans what the user typed into an amount field. Returns `null` when the keystroke
 * should be rejected so the field keeps its previous value.
 */
export function sanitizeAmountInput(raw: string): string | null {
  let value = raw.replace(/,/g, ".").replace(/\s/g, "");
  if (value === "") return "";
  if (!/^\d*\.?\d*$/.test(value)) return null;

  const [whole = "", fraction] = value.split(".");
  if (fraction !== undefined && fraction.length > MAX_DECIMALS) return null;

  if (value.startsWith(".")) value = `0${value}`;
  // Strip leading zeros ("007" -> "7") but keep "0" and "0.x".
  if (whole.length > 1) value = value.replace(/^0+(?=\d)/, "");
  if ((value.split(".")[0] ?? "").length > MAX_WHOLE_DIGITS) return null;
  if (significantDigits(value) > MAX_SIGNIFICANT_DIGITS) return null;
  return value;
}

export function parseAmount(value: string): number {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Rounds to the precision the inputs accept. Balances are kept at this precision so that
 * floating point noise (e.g. 1.7438422199999999) can't make MAX round above the balance.
 */
export function roundAmount(amount: number): number {
  return Number(inputFormatters.nearest.format(withoutFloatNoise(amount)));
}

/** Formats an amount for an input field, rounded in the given direction. */
export function formatForInput(
  amount: number,
  rounding: Rounding = "nearest",
): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return inputFormatters[rounding].format(withoutFloatNoise(amount));
}
