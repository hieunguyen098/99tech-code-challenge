import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { priceFeed } from "../../../test/fixtures";
import { parsePriceFeed } from "../../tokens/tokens";
import { TokenPicker } from "./TokenPicker";

// The fixture tokens sort to: ETH, rSWTH, SWTH, USDC, WBTC.

function renderPicker() {
  const onSelect = vi.fn();
  render(
    <TokenPicker
      open
      tokens={parsePriceFeed(priceFeed)}
      balances={{}}
      selectedSymbol="ETH"
      onSelect={onSelect}
      onClose={() => {}}
    />,
  );
  const search = screen.getByRole("combobox", { name: "Search tokens" });
  return { onSelect, search, user: userEvent.setup() };
}

/** Symbol of the option currently highlighted for the keyboard, if any. */
function activeSymbol() {
  return screen
    .queryByRole("option", { selected: true })
    ?.textContent?.match(/^[A-Za-z]+/)?.[0];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TokenPicker search", () => {
  it("picks the best match on Enter", async () => {
    const { onSelect, search, user } = renderPicker();
    await user.type(search, "swth{Enter}");
    expect(onSelect).toHaveBeenCalledWith("SWTH");
  });

  it("ignores Enter when nothing has been typed or highlighted", async () => {
    const { onSelect, search, user } = renderPicker();
    await user.type(search, "{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    expect(activeSymbol()).toBeUndefined();
  });

  it("ignores Enter while an IME is composing", async () => {
    const { onSelect, search, user } = renderPicker();
    await user.type(search, "swth");
    fireEvent.keyDown(search, { key: "Enter", isComposing: true });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("TokenPicker keyboard navigation", () => {
  it("↓ from an empty search highlights the first token, and Enter picks it", async () => {
    const { onSelect, search, user } = renderPicker();
    await user.type(search, "{ArrowDown}");
    expect(activeSymbol()).toBe("ETH");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("ETH");
  });

  it("moves with ↓/↑ and stops at both ends", async () => {
    const { search, user } = renderPicker();
    await user.type(search, "{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeSymbol()).toBe("SWTH");
    await user.keyboard("{ArrowUp}");
    expect(activeSymbol()).toBe("rSWTH");
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(activeSymbol()).toBe("ETH");
    await user.keyboard("{ArrowDown}".repeat(10));
    expect(activeSymbol()).toBe("WBTC");
  });

  it("↑ from nothing starts at the last token", async () => {
    const { search, user } = renderPicker();
    await user.type(search, "{ArrowUp}");
    expect(activeSymbol()).toBe("WBTC");
  });

  it("typing makes the best match active again", async () => {
    const { search, user } = renderPicker();
    await user.type(search, "{ArrowDown}{ArrowDown}");
    await user.type(search, "u");
    expect(activeSymbol()).toBe("USDC");
  });

  it("tells screen readers which option is active", async () => {
    const { search, user } = renderPicker();
    expect(search).not.toHaveAttribute("aria-activedescendant");
    await user.type(search, "{ArrowDown}");
    const option = screen.getByRole("option", { selected: true });
    expect(search).toHaveAttribute("aria-activedescendant", option.id);
  });

  it("scrolls the active option into view on keyboard moves", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const { search, user } = renderPicker();
    await user.type(search, "{ArrowUp}");
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
    expect(scroll.mock.contexts.at(-1)).toBe(
      screen.getByRole("option", { selected: true }),
    );
  });

  it("highlights on mouse movement without scrolling the list", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    renderPicker();
    const swth = screen.getByRole("option", { name: /^SWTH/ });
    fireEvent.mouseMove(swth);
    expect(activeSymbol()).toBe("SWTH");
    expect(scroll).not.toHaveBeenCalled();
  });

  it("picks an option on click", async () => {
    const { onSelect, user } = renderPicker();
    await user.click(screen.getByRole("option", { name: /^USDC/ }));
    expect(onSelect).toHaveBeenCalledWith("USDC");
  });
});
