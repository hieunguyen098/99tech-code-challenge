import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("uses its label as the accessible name and never submits forms", () => {
    render(
      <IconButton label="Close">
        <svg aria-hidden />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("requires a label at compile time", () => {
    // Type-level test: if `label` ever becomes optional, this line stops being an error
    // and `tsc` fails the build on the unused directive.
    // @ts-expect-error -- an icon-only button without an accessible name
    const element = <IconButton>x</IconButton>;
    expect(element).toBeTruthy();
  });
});
