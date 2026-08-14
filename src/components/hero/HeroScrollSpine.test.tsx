import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import gsap from "gsap";

const revert = vi.fn();
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: vi.fn((fn: () => void) => {
      fn();
      return { revert };
    }),
    to: vi.fn(),
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { refresh: vi.fn() } }));

import { HeroScrollSpine } from "./HeroScrollSpine.client";

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("HeroScrollSpine motion gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__introComplete = true; // intro gate open so only motion-pref decides
  });

  it("runs no scroll animation when reduced motion is requested", () => {
    setReducedMotion(true);
    render(
      <HeroScrollSpine>
        <div className="hero-drift-slow" />
      </HeroScrollSpine>,
    );
    expect(gsap.to).not.toHaveBeenCalled();
    expect(gsap.context).not.toHaveBeenCalled();
  });

  it("sets up and cleans up its timeline when motion is allowed", () => {
    setReducedMotion(false);
    const { unmount } = render(
      <HeroScrollSpine>
        <div className="hero-drift-slow" />
      </HeroScrollSpine>,
    );
    expect(gsap.context).toHaveBeenCalled();
    unmount();
    expect(revert).toHaveBeenCalled();
  });
});
