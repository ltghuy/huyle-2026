import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { fromTo } = vi.hoisted(() => ({ fromTo: vi.fn() }));
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: (fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    },
    fromTo,
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

import { Reveal } from "./Reveal";

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

describe("Reveal", () => {
  beforeEach(() => fromTo.mockClear());

  it("renders children and animates when motion is allowed", () => {
    setReducedMotion(false);
    render(
      <Reveal>
        <p>Revealed</p>
      </Reveal>,
    );
    expect(screen.getByText("Revealed")).toBeInTheDocument();
    expect(fromTo).toHaveBeenCalled();
  });

  it("renders children with no animation under reduced motion", () => {
    setReducedMotion(true);
    render(
      <Reveal>
        <p>Revealed</p>
      </Reveal>,
    );
    expect(screen.getByText("Revealed")).toBeInTheDocument();
    expect(fromTo).not.toHaveBeenCalled();
  });
});
