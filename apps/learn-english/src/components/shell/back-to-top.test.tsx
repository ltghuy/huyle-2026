import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "./back-to-top";

function scrollPage(y: number) {
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }) as MediaQueryList);
}

describe("BackToTop", () => {
  const scrollTo = vi.fn();

  beforeEach(() => {
    scrollTo.mockClear();
    vi.stubGlobal("scrollTo", scrollTo);
    stubReducedMotion(false);
    scrollPage(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays hidden near the top and shows once the page is scrolled down", () => {
    render(<BackToTop />);
    const button = screen.getByTitle("Lên đầu trang");
    expect(button).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveAttribute("tabindex", "-1");

    scrollPage(1200);
    expect(button).toHaveAttribute("aria-hidden", "false");
    expect(button).toHaveAttribute("tabindex", "0");

    scrollPage(100);
    expect(button).toHaveAttribute("aria-hidden", "true");
  });

  it("scrolls smoothly to the top, or jumps when the learner prefers reduced motion", () => {
    render(<BackToTop />);
    scrollPage(1200);
    fireEvent.click(screen.getByRole("button", { name: "Lên đầu trang" }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });

    stubReducedMotion(true);
    vi.stubGlobal("scrollTo", scrollTo);
    fireEvent.click(screen.getByRole("button", { name: "Lên đầu trang" }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "auto" });
  });
});
