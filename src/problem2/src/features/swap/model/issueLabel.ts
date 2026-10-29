import type { SwapIssue } from "./validation";

/** Submit button copy for each validation issue, so the user always knows what to do next. */
export function issueLabel(issue: SwapIssue): string {
  switch (issue.kind) {
    case "select-token":
      return "Select a token";
    case "same-token":
      return "Choose two different tokens";
    case "enter-amount":
      return "Enter an amount";
    case "amount-too-small":
      return "Amount too small";
    case "insufficient-balance":
      return `Insufficient ${issue.symbol} balance`;
  }
}
