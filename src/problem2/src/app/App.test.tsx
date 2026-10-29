import { QueryClient } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Tests may reach into feature internals to build expectations; app code may not.
import { submitSwap, type SubmitSwapResponse } from "../features/swap/api";
import { parsePriceFeed } from "../features/tokens/tokens";
import {
  applyBalanceChanges,
  createMockBalances,
} from "../features/wallet/balances";
import { formatForInput } from "../shared/lib/amount";
import { formatAmount } from "../shared/lib/format";
import { priceFeed } from "../test/fixtures";
import App from "./App";
import { AppProviders } from "./AppProviders";

vi.mock("../features/swap/api", () => ({ submitSwap: vi.fn() }));

const startingBalances = createMockBalances(parsePriceFeed(priceFeed));
const usdcBalance = startingBalances.USDC ?? 0;

function stubPriceFeed(...responses: Array<() => Response>) {
  const fetchMock = vi.fn();
  for (const response of responses)
    fetchMock.mockImplementationOnce(async () => response());
  fetchMock.mockImplementation(async () => Response.json(priceFeed));
  vi.stubGlobal("fetch", fetchMock);
}

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <AppProviders queryClient={client}>
      <App />
    </AppProviders>,
  );
  return { user };
}

const payInput = () => screen.getByRole("textbox", { name: "You pay" });
const receiveInput = () => screen.getByRole("textbox", { name: "You receive" });
// The submit button's label tells the user what to do next, so it changes by design.
const SUBMIT_LABELS =
  /^(Confirm swap|Swapping…|Enter an amount|Amount too small|Insufficient \w+ balance)$/;
const submitButton = () => screen.getByRole("button", { name: SUBMIT_LABELS });
// Only an open <dialog> is in the accessibility tree, so finding it means it is open.
const tokenDialog = () =>
  screen.getByRole("dialog", { name: "Select a token" });

async function renderLoadedApp() {
  const rendered = renderApp();
  await screen.findByRole("textbox", { name: "You pay" });
  return rendered;
}

beforeEach(() => {
  stubPriceFeed();
  vi.mocked(submitSwap).mockResolvedValue({ txHash: "0xabc" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("loading prices", () => {
  it("shows a skeleton until prices arrive", async () => {
    renderApp();
    expect(
      screen.getByRole("status", { name: "Loading swap form" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("textbox", { name: "You pay" }),
    ).toBeVisible();
  });

  it("shows the error and recovers when the user retries", async () => {
    let respond!: () => void;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        // Hold the retry open so the in-between state can be checked.
        .mockReturnValueOnce(
          new Promise<Response>((resolve) => {
            respond = () => resolve(Response.json(priceFeed));
          }),
        ),
    );
    const { user } = renderApp();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn’t load token prices");
    expect(alert).toHaveTextContent("Price feed responded with 500");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    // Retrying with no data resets the query to "pending", so the skeleton shows again.
    expect(
      screen.getByRole("status", { name: "Loading swap form" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    respond();
    expect(
      await screen.findByRole("textbox", { name: "You pay" }),
    ).toBeVisible();
  });
});

describe("amount entry", () => {
  it("converts what the user pays into what they receive", async () => {
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100");
    expect(receiveInput()).toHaveValue("0.05");
    expect(submitButton()).toHaveTextContent("Confirm swap");
    expect(submitButton()).toBeEnabled();
  });

  it("converts backwards when typing what they want to receive", async () => {
    const { user } = await renderLoadedApp();
    await user.type(receiveInput(), "0.1");
    expect(payInput()).toHaveValue("200");
  });

  it("ignores characters that are not part of a decimal number", async () => {
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "abc1.2.3,5");
    expect(payInput()).toHaveValue("1.235");
  });

  it("keeps the typed amount with its token when flipping", async () => {
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100");
    await user.click(screen.getByRole("button", { name: "Switch tokens" }));

    expect(screen.getByRole("button", { name: "You pay: ETH" })).toBeVisible();
    expect(receiveInput()).toHaveValue("100");
    expect(payInput()).toHaveValue("0.05");
  });
});

describe("validation", () => {
  it("blocks amounts above the balance and explains why", async () => {
    const { user } = await renderLoadedApp();
    await user.type(payInput(), String(Math.ceil(usdcBalance) + 1));

    expect(payInput()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Exceeds balance");
    expect(submitButton()).toHaveTextContent("Insufficient USDC balance");
    expect(submitButton()).toBeDisabled();
  });

  it("MAX fills the exact balance and allows the swap", async () => {
    const { user } = await renderLoadedApp();
    await user.click(screen.getByRole("button", { name: "MAX" }));
    expect(payInput()).toHaveValue(formatForInput(usdcBalance));
    expect(submitButton()).toBeEnabled();
  });

  it("rejects amounts that would receive nothing", async () => {
    const { user } = await renderLoadedApp();
    await user.click(screen.getByRole("button", { name: "You receive: ETH" }));
    await user.keyboard("wbtc{Enter}");
    await user.type(payInput(), "0.00001");

    expect(receiveInput()).toHaveValue("0");
    expect(submitButton()).toHaveTextContent("Amount too small");
    expect(submitButton()).toBeDisabled();
  });
});

describe("submitting", () => {
  it("shows progress, then updates balances and confirms", async () => {
    let finish!: (result: SubmitSwapResponse) => void;
    vi.mocked(submitSwap).mockReturnValue(
      new Promise((resolve) => (finish = resolve)),
    );
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100");
    await user.click(submitButton());

    expect(submitButton()).toHaveTextContent("Swapping…");
    expect(submitButton()).toBeDisabled();
    expect(payInput()).toBeDisabled();
    expect(vi.mocked(submitSwap).mock.calls[0]?.[0]).toEqual({
      fromSymbol: "USDC",
      toSymbol: "ETH",
      fromAmount: 100,
      toAmount: 0.05,
    });

    finish({ txHash: "0xabc" });

    expect(
      await screen.findByText("Swapped 100 USDC for 0.05 ETH · tx 0xabc"),
    ).toBeVisible();
    expect(payInput()).toHaveValue("");
    const expected = applyBalanceChanges(startingBalances, [
      { symbol: "USDC", delta: -100 },
      { symbol: "ETH", delta: 0.05 },
    ]);
    const payGroup = screen.getByRole("group", { name: "You pay" });
    expect(payGroup).toHaveTextContent(
      `Balance: ${formatAmount(expected.USDC ?? 0)}`,
    );
  });

  it("keeps the amount and explains when the swap fails", async () => {
    vi.mocked(submitSwap).mockRejectedValue(new Error("network down"));
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100");
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Swap failed. Please try again.",
    );
    expect(payInput()).toHaveValue("100");

    await user.type(payInput(), "0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears a failed-swap error when the user changes tokens", async () => {
    vi.mocked(submitSwap).mockRejectedValue(new Error("network down"));
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100");
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Swap failed");

    await user.click(screen.getByRole("button", { name: "Switch tokens" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits with Enter from the amount field", async () => {
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100{Enter}");
    expect(submitSwap).toHaveBeenCalledTimes(1);
  });
});

describe("token picker", () => {
  it("opens with the search focused and picks the exact match on Enter", async () => {
    const { user } = await renderLoadedApp();
    await user.click(screen.getByRole("button", { name: "You receive: ETH" }));

    expect(
      within(tokenDialog()).getByRole("combobox", { name: "Search tokens" }),
    ).toHaveFocus();

    await user.keyboard("swth{Enter}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "You receive: SWTH" }),
    ).toBeVisible();
  });

  it("never submits the swap when Enter finds no token", async () => {
    const { user } = await renderLoadedApp();
    await user.type(payInput(), "100");
    await user.click(screen.getByRole("button", { name: "You receive: ETH" }));
    await user.keyboard("zzz{Enter}");

    expect(submitSwap).not.toHaveBeenCalled();
    expect(
      within(tokenDialog()).getByText("No tokens match “zzz”"),
    ).toBeVisible();
  });

  it("starts with an empty search every time it opens", async () => {
    const { user } = await renderLoadedApp();
    const openPicker = () =>
      user.click(screen.getByRole("button", { name: "You receive: ETH" }));

    await openPicker();
    await user.keyboard("wb");
    await user.click(
      within(tokenDialog()).getByRole("button", { name: "Close" }),
    );
    await openPicker();

    expect(
      within(tokenDialog()).getByRole("combobox", { name: "Search tokens" }),
    ).toHaveValue("");
  });

  it("swaps the two tokens when picking the one on the other side", async () => {
    const { user } = await renderLoadedApp();
    await user.click(screen.getByRole("button", { name: "You receive: ETH" }));
    await user.click(
      within(tokenDialog()).getByRole("button", { name: "USDC" }),
    );

    expect(screen.getByRole("button", { name: "You pay: ETH" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "You receive: USDC" }),
    ).toBeVisible();
  });
});
