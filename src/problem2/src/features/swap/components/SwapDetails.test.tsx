import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Token } from "../../tokens";
import { SwapDetails } from "./SwapDetails";

const token = (symbol: string, price: number): Token => ({
  symbol,
  price,
  updatedAt: "",
  iconUrl: "",
});

function renderDetails() {
  render(
    <SwapDetails fromToken={token("SWTH", 0.004)} toToken={token("USDC", 1)} />,
  );
  // Screen readers hear the rate followed by what the button does.
  return screen.getByRole("button", {
    name: "1 SWTH = 0.004 USDC ($0.004), invert rate",
  });
}

describe("SwapDetails", () => {
  it("shows a cheap token's real unit price, not '< $0.01'", () => {
    expect(renderDetails()).toHaveTextContent("($0.004)");
  });

  it("inverts the rate when pressed, and back again", async () => {
    const button = renderDetails();
    await userEvent.click(button);
    expect(button).toHaveAccessibleName(
      "1 USDC = 250 SWTH ($1.00), invert rate",
    );
    await userEvent.click(button);
    expect(button).toHaveAccessibleName(
      "1 SWTH = 0.004 USDC ($0.004), invert rate",
    );
  });
});
