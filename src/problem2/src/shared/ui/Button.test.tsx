import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it('is type="button" by default, so it never submits a form by accident', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button>Save</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("while loading: blocks clicks, announces busy, keeps its label", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Swapping…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Swapping…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is not marked busy when idle", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute(
      "aria-busy",
    );
  });
});
