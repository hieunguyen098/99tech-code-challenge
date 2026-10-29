# Problem 2: Fancy Form

A currency swap form built with **Vite, React 19, TypeScript (strict), Tailwind CSS v4 and TanStack Query**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # type-check + lint + format check + tests (what CI would run)
npm run build      # production build
```

| Script                            | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm test` / `npm run test:watch` | Vitest: unit tests and user-flow tests (Testing Library + jsdom) |
| `npm run typecheck`               | `tsc -b` with `strict` and `noUncheckedIndexedAccess`            |
| `npm run lint`                    | oxlint                                                           |
| `npm run format` / `format:check` | Prettier (with Tailwind class sorting)                           |

Optional: copy `.env.example` to `.env` to point `VITE_PRICES_URL` at another price feed.

## Features

- **Live prices** from the Switcheo feed, refreshed every minute. Duplicate entries keep the most recent price; tokens without a valid price are omitted.
- **Two-way input**: type in either "You pay" or "You receive"; the other side is calculated. USD values are shown under each amount.
- **Token picker**: searchable modal (native `<dialog>`) with popular tokens, prices and balances. Keyboard-first: focus stays in the search box, <kbd>↓</kbd>/<kbd>↑</kbd> move through the results (the list scrolls to follow), and <kbd>Enter</kbd> picks the highlighted token — typing highlights the best match, exact match first, so "swth" picks SWTH, not rSWTH. Built as a WAI-ARIA combobox, so screen readers announce each highlighted token. Picking the token on the other side swaps the two.
- **Validation** that explains itself: the submit button always says what's blocking the swap ("Enter an amount", "Insufficient USDC balance", "Amount too small"), and an over-balance amount is highlighted inline.
- **Simulated submit**: loading state, then balances update and a success toast shows a mock tx hash. A failed submit keeps the amount and shows an error.
- MAX, flip, invertible rate, loading skeleton, price-feed error with retry, and responsive down to 320px.
- **Accessible**: labelled controls, `aria-invalid`/`aria-describedby` errors, live regions for status, focus management in the modal, and reduced-motion support that keeps the (essential) loading spinner.

## Architecture

Code is organised **by feature**. Everything a feature needs (UI, hooks, logic, API calls) lives in its folder, so adding, changing or deleting a feature happens in one place.

```
src/
  main.tsx                    entry point
  app/                        composition: wires features together
    AppProviders.tsx          QueryClient + ErrorBoundary (shared by main.tsx and tests)
    App.tsx                   page layout; picks loading / error / ready and wires features together
    App.test.tsx              user-flow tests
  features/
    tokens/                   token list and prices
      api.ts                  fetchTokens()
      tokens.ts               parsePriceFeed(), searchTokens(), convertAmount(), icon URLs
      useTokens.ts            TanStack Query: caching, retries, background refresh
      TokenIcon.tsx
      index.ts                public API
    wallet/                   balances (mocked)
      balances.ts             createMockBalances(), applyBalanceChanges()
      WalletProvider.tsx, WalletContext.ts (useWallet)
      index.ts                public API
    swap/                     the swap form
      index.ts                public API: SwapForm, SwapFormSkeleton, describeSwapReceipt, SwapReceipt
      api.ts                  submitSwap() (mocked endpoint), SwapRequest, SwapReceipt
      useSwap.ts              composes state + wallet + submit mutation
      components/             React UI
        SwapForm.tsx          rendering only
        SwapFormSkeleton.tsx  loading placeholder, kept next to the form it mirrors
        AmountField.tsx       amount input + TokenSelectButton
        TokenPicker.tsx       search dialog + TokenListItem rows
        SwapDetails.tsx       rate and fee
      model/                  pure logic, no React (unit tested)
        swapState.ts          reducer + derived inputs
        validation.ts         validateSwap()
        receipt.ts            describeSwapReceipt() for the confirmation toast
        rate.ts               describeRate(): "1 SWTH = 0.0000001554 WBTC"
        issueLabel.ts         validation issue → button copy
  shared/                     generic, feature-agnostic building blocks
    ui/                       Button, IconButton, Dialog, ErrorState, Toast, Spinner, ErrorBoundary,
                              icons (the app's icon set)
    lib/                      amount.ts (parse / round / format inputs), format.ts
    config.ts                 env-driven settings
  test/                       test setup and fixtures
  architecture.test.ts        enforces the dependency rules below
```

**Dependency rules** (enforced by `architecture.test.ts`, which fails with the offending file and import):

- Dependencies point one way: `app → features → shared`. `shared/` never imports from a feature.
- Actions use `Button` (text) or `IconButton` (icon-only, with a **required** `label`). A raw `<button>` is only for one-off composite controls such as a token list row, and lint (`react/button-has-type`) makes sure every button has an explicit `type`, so none can submit a form by accident.
- A feature's `model/` folder is **pure logic**: it may not import React, components or hooks.
- Outside a feature, code imports it **only through its `index.ts`**, so a feature's internals can change freely. Tests are exempt so they can build expectations from internals.
- Features depend on each other only where it makes sense: `swap` uses `tokens` and `wallet`; `wallet` uses only the `Token` type; `tokens` uses nothing. The wallet takes generic balance changes (`applyBalanceChanges`) instead of swaps, so a future "Send" feature can use it without the wallet knowing about it.

Each feature folder stays **flat** until it grows past roughly 10 files (as `tokens` and `wallet` are). Then it is grouped by role, as `swap` is: `components/` for React UI and `model/` for pure logic. A role only gets a folder once it has 2+ files, so a single `api.ts` or `useSwap.ts` stays at the feature root. Types live next to the code they describe, not in a central `types` file. To add a feature: create `features/<name>/` with an `index.ts`, and compose it in `app/`.

### Key decisions

- **TanStack Query instead of `useEffect` fetching.** It gives caching, deduplication, retries with backoff and background refresh (a swap quote must not go stale), and the submit is a `useMutation` with `isPending`/`isError` for free. A failed background refresh keeps showing the last good prices.
- **Only the typed amount is stored.** The other field is derived from prices on every render, so the two can never disagree, and no effect is needed to sync them.
- **State changes go through a reducer** (`swapReducer`). Transitions like "picking the other side's token swaps them" are pure functions with their own tests.
- **The wallet is app-level state** behind `useWallet()`, mirroring how a real wallet connector would plug in. The swap feature doesn't know balances are mocked.
- **Validation returns a `kind`, not copy.** `validateSwap()` is UI-agnostic; `issueLabel()` maps it to text, which keeps the logic ready for translation.
- **One shared `Dialog`** on top of the native `<dialog>`: the browser handles focus trapping, <kbd>Escape</kbd> and the backdrop, and `onClose` fires from the single native close event, so every way of closing behaves the same. The token picker is rendered **outside the `<form>`** so pressing Enter in its search box can never submit the swap.
- **Money handling rules** (each one has regression tests, including property checks over thousands of conversions):
  - **Rounding goes against the user, never for them:** the amount you _receive_ rounds down, the amount you _pay_ rounds up, and MAX rounds down. Rounding can never credit more than a payment is worth.
  - **Shown amounts never exceed real ones:** balances and other token amounts are truncated for display, so a balance of 1.65316 shows as "1.6531", not "1.6532" (typing the shown balance used to fail with "Insufficient balance").
  - **What you type is what gets submitted:** typed amounts are capped at 15 significant digits, the most a JavaScript number holds exactly, so they are never silently changed.
  - **Float noise is removed before rounding:** `0.1 + 0.2 = 0.30000000000000004` would otherwise round _up_ to 0.30000001. Balances are kept at 8 decimals with one shared rounding implementation.
  - **A deliberate trade-off:** amounts are JavaScript numbers. A production swap would store integer base units (`bigint`) and remove float concerns entirely. Numbers are kept here because the price feed is itself floating point and nothing is settled for real, and the rules above make them safe at this precision.

## Testing

- **Unit tests** next to each module (`*.test.ts`): amount parsing and rounding, conversion, search ranking, validation, the swap reducer and balance updates.
- **Architecture test** (`architecture.test.ts`): fails if an import breaks the dependency rules.
- **User-flow tests** (`App.test.tsx`) render the real app with only the network mocked, and interact the way a user does: typing, MAX, flipping, the token picker, submit success and failure, price-feed failure and retry. Each bug found during manual QA has a regression test; for example, _"never submits the swap when Enter finds no token"_ fails if the token picker is moved back inside the form.

## Assumptions

- No wallet is connected, so each token gets a **deterministic mock balance** worth $250–$5,000, which keeps the demo explorable while "insufficient balance" can still be triggered.
- The rate is `fromPrice / toPrice` with no fee or slippage, since the brief only provides spot prices.

## What I'd do next for a real product

- Represent amounts as integer base units (`bigint`) with per-token decimals instead of JavaScript numbers, and do conversion with a decimal library (or scaled integer prices), so rounding stops being something every new code path has to remember.
- Server-side quotes with a slippage limit and an expiry, re-quoted when prices refresh.
- End-to-end tests in a real browser (Playwright) for what jsdom can't model, such as native `<dialog>` keyboard behaviour.
- Error reporting (e.g. Sentry) wired into the `ErrorBoundary`.
