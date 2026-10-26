import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScrambleText } from "./ScrambleText";

function setReducedMotion(value: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: value,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("ScrambleText", () => {
  it("renders the final text immediately under reduced motion", () => {
    setReducedMotion(true);
    render(<ScrambleText text="Reduced Motion" />);
    expect(screen.getByText("Reduced Motion")).toBeInTheDocument();
  });

  it("mounts and preserves text length while scrambling (motion allowed)", () => {
    setReducedMotion(false);
    const { container } = render(<ScrambleText text="Hello World" />);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
    // scrambled output preserves length (and spaces), so length is stable
    expect(span?.textContent?.length).toBe("Hello World".length);
  });
});
