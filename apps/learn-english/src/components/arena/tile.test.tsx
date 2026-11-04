import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tile, tileVariants } from "./tile";

describe("Tile", () => {
  it("is an idle medium tile by default", () => {
    render(<Tile>K</Tile>);
    const tile = screen.getByText("K");
    expect(tile).toHaveAttribute("data-state", "idle");
    expect(tile.className).toContain("border-b-4");
    expect(tile.className).toContain("size-11");
  });

  it("shows each state with theme colours only", () => {
    const classes = (state: "correct" | "wrong" | "locked" | "empty" | "filled") => tileVariants({ state });
    expect(classes("correct")).toContain("border-success");
    expect(classes("wrong")).toContain("border-destructive");
    expect(classes("wrong")).toContain("animate-tile-shake");
    expect(classes("locked")).toContain("text-muted-foreground");
    expect(classes("empty")).toContain("border-dashed");
    expect(classes("filled")).toContain("border-primary/50");
    for (const state of ["idle", "filled", "correct", "wrong", "locked", "empty"] as const) {
      expect(tileVariants({ state })).not.toMatch(/#[0-9a-f]{3,6}|rgb\(|oklch\(/i);
    }
  });

  it("is pressable with a visible focus ring when interactive, and flips in on reveal", () => {
    expect(tileVariants({ interactive: true })).toContain("focus-visible:ring-3");
    expect(tileVariants({ interactive: true })).toContain("active:translate-y-0.5");
    expect(tileVariants({ flip: true })).toContain("animate-tile-flip");
    expect(tileVariants({ size: "option" })).toContain("min-h-14");
  });

  it("passes props and labels through", () => {
    render(<Tile aria-hidden size="lg" className="extra" data-testid="t" />);
    const tile = screen.getByTestId("t");
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile.className).toContain("extra");
    expect(tile.className).toContain("size-12");
  });
});
