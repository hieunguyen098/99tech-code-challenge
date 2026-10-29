import { clsx } from "clsx";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Dialog } from "../../../shared/ui/Dialog";
import { searchTokens, TokenIcon, type Token } from "../../tokens";
import type { Balances } from "../../wallet";
import { TokenListItem } from "./TokenListItem";

const POPULAR_SYMBOLS = ["USDC", "ETH", "WBTC", "ATOM", "SWTH"];

/** No option is active until the user types or presses ↓/↑. */
const NONE = -1;

interface TokenPickerProps {
  open: boolean;
  tokens: Token[];
  balances: Balances;
  selectedSymbol: string | undefined;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

/**
 * Searchable token list following the WAI-ARIA combobox pattern: focus stays in the
 * search box, ↓/↑ move the active option, Enter picks it, and screen readers follow
 * along through `aria-activedescendant`.
 */
export function TokenPicker({
  open,
  tokens,
  balances,
  selectedSymbol,
  onSelect,
  onClose,
}: TokenPickerProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(NONE);

  const results = useMemo(() => searchTokens(tokens, query), [tokens, query]);
  const popular = useMemo(
    () => tokens.filter((t) => POPULAR_SYMBOLS.includes(t.symbol)),
    [tokens],
  );
  const optionId = (symbol: string) => `${listId}-${symbol}`;
  const active = results[activeIndex];

  function changeQuery(value: string) {
    setQuery(value);
    // Typing makes the best match active, so Enter picks it. An empty search has no
    // active option, so a reflexive Enter doesn't silently pick the first token.
    setActiveIndex(value.trim() ? 0 : NONE);
    listContainerRef.current?.scrollTo({ top: 0 });
  }

  function moveActive(step: 1 | -1) {
    if (results.length === 0) return;
    const next =
      activeIndex === NONE
        ? step === 1
          ? 0
          : results.length - 1
        : Math.min(Math.max(activeIndex + step, 0), results.length - 1);
    setActiveIndex(next);
    // Only keyboard moves scroll: if mouse moves did, the list would slide under a
    // still pointer and the highlight would jump to whatever row passed beneath it.
    const nextSymbol = results[next]?.symbol;
    if (nextSymbol) {
      document
        .getElementById(optionId(nextSymbol))
        ?.scrollIntoView({ block: "nearest" });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault(); // keep the caret where it is
        moveActive(event.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter":
        event.preventDefault();
        // While an IME is composing, Enter confirms the composition, not a choice.
        if (event.nativeEvent.isComposing) return;
        if (active) onSelect(active.symbol);
        break;
    }
  }

  return (
    <Dialog
      open={open}
      title="Select a token"
      initialFocusRef={searchRef}
      // Reset on close, not on open, so the previous search never flashes when it reopens.
      onClose={() => {
        setQuery("");
        setActiveIndex(NONE);
        onClose();
      }}
    >
      <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
        <input
          ref={searchRef}
          // Plain text, not type="search": Chrome's search input swallows the first Escape to clear itself.
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active.symbol) : undefined}
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by symbol"
          aria-label="Search tokens"
          className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-violet-400"
        />

        {!query && popular.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {popular.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => onSelect(token.symbol)}
                aria-current={token.symbol === selectedSymbol || undefined}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition",
                  token.symbol === selectedSymbol
                    ? "border-violet-400 bg-violet-500/20"
                    : "border-white/10 hover:border-white/30 hover:bg-white/5",
                )}
              >
                <TokenIcon token={token} size={18} />
                {token.symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={listContainerRef}
        className="h-[min(50vh,420px)] overflow-y-auto border-t border-white/5 py-2"
      >
        <ul id={listId} role="listbox" aria-label="Tokens">
          {results.map((token, index) => (
            <TokenListItem
              key={token.symbol}
              id={optionId(token.symbol)}
              token={token}
              balance={balances[token.symbol] ?? 0}
              active={index === activeIndex}
              current={token.symbol === selectedSymbol}
              onSelect={onSelect}
              onPointerActivate={() => setActiveIndex(index)}
            />
          ))}
        </ul>
        {/* Outside the listbox: a listbox may only contain options. */}
        {results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            No tokens match “{query}”
          </p>
        )}
      </div>
    </Dialog>
  );
}
