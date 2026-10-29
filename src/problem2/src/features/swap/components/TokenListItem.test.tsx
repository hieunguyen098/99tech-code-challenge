import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Token } from "../../tokens";
import { TokenListItem } from "./TokenListItem";

const SWTH: Token = {
  symbol: "SWTH",
  price: 0.004,
  updatedAt: "",
  iconUrl: "",
};

function renderItem({ active = false, current = false } = {}) {
  const onSelect = vi.fn();
  const onPointerActivate = vi.fn();
  render(
    <ul role="listbox">
      <TokenListItem
        id="option-swth"
        token={SWTH}
        balance={250000}
        active={active}
        current={current}
        onSelect={onSelect}
        onPointerActivate={onPointerActivate}
      />
    </ul>,
  );
  return { onSelect, onPointerActivate, option: screen.getByRole("option") };
}

describe("TokenListItem", () => {
  it("shows the symbol, unit price, balance and its USD value", () => {
    const { option } = renderItem();
    expect(option).toHaveTextContent("SWTH");
    expect(option).toHaveTextContent("$0.004");
    expect(option).toHaveTextContent("250,000");
    expect(option).toHaveTextContent("$1,000.00");
  });

  it("selects its token when clicked", async () => {
    const { option, onSelect } = renderItem();
    await userEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith("SWTH");
  });

  it("marks the active option and the current token separately", () => {
    const { option } = renderItem({ active: true, current: true });
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(option).toHaveAttribute("aria-current", "true");
  });

  it("is neither active nor current by default", () => {
    const { option } = renderItem();
    expect(option).toHaveAttribute("aria-selected", "false");
    expect(option).not.toHaveAttribute("aria-current");
  });

  it("asks to become active on mouse movement, unless it already is", () => {
    const idle = renderItem();
    fireEvent.mouseMove(idle.option);
    expect(idle.onPointerActivate).toHaveBeenCalledTimes(1);
  });

  it("doesn't re-activate itself while already active", () => {
    const { option, onPointerActivate } = renderItem({ active: true });
    fireEvent.mouseMove(option);
    expect(onPointerActivate).not.toHaveBeenCalled();
  });
});
