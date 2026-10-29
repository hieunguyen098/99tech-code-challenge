import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Token } from "../../tokens";
import { TokenSelectButton } from "./TokenSelectButton";

const USDC: Token = { symbol: "USDC", price: 1, updatedAt: "", iconUrl: "" };

describe("TokenSelectButton", () => {
  it("shows the chosen token and names its field for screen readers", async () => {
    const onClick = vi.fn();
    render(
      <TokenSelectButton token={USDC} fieldLabel="You pay" onClick={onClick} />,
    );
    const button = screen.getByRole("button", { name: "You pay: USDC" });
    expect(button).toHaveTextContent("USDC");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prompts to select a token when none is chosen", () => {
    render(
      <TokenSelectButton
        token={null}
        fieldLabel="You receive"
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "You receive: select token" }),
    ).toHaveTextContent("Select token");
  });
});
