import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

function renderDialog() {
  const onClose = vi.fn();
  render(
    <Dialog open title="Example" onClose={onClose}>
      <input aria-label="Field" />
    </Dialog>,
  );
  return {
    onClose,
    dialog: screen.getByRole("dialog", { name: "Example" }),
    field: screen.getByRole("textbox", { name: "Field" }),
  };
}

describe("Dialog", () => {
  it("closes on a press that starts and ends on the backdrop", () => {
    const { dialog, onClose } = renderDialog();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when a drag starts inside and ends on the backdrop", () => {
    // The browser fires `click` on the common ancestor, the <dialog> itself.
    const { dialog, field, onClose } = renderDialog();
    fireEvent.pointerDown(field);
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute("open");
  });

  it("closes from the close button", () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
