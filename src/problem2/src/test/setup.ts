import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom implements <dialog> but not its modal API. Mirror the browser closely enough
// for our usage: toggling `open` and firing the native "close" event.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom has no layout, so it doesn't implement scrolling; make these no-ops that tests can spy on.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.scrollTo ??= function scrollTo() {};
