import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Inert gsap covering both the Reveal wrapper (context/fromTo) and the
// ScrollHighlightText effect (utils.toArray, set, chainable timeline.to). The
// context mock runs its callback synchronously, so every gsap call inside the
// effect executes during render and must exist on the mock.
vi.mock("gsap", () => {
  const timeline = () => {
    const tl = { to: vi.fn(() => tl) };
    return tl;
  };
  return {
    default: {
      registerPlugin: vi.fn(),
      context: (fn: () => void) => {
        fn();
        return { revert: vi.fn() };
      },
      set: vi.fn(),
      fromTo: vi.fn(),
      timeline: vi.fn(timeline),
      utils: { toArray: (x: ArrayLike<unknown>) => Array.from(x) },
    },
  };
});
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

import { Statement } from "./Statement";

describe("Statement (mission-statement beat)", () => {
  it("renders a single centered statement passage", () => {
    const { container } = render(<Statement />);
    const section = container.querySelector("section#statement");
    expect(section).toBeTruthy();
    const paras = section?.querySelectorAll("p") ?? [];
    expect(paras).toHaveLength(1);
    expect(paras[0].textContent).toMatch(/production web platforms/i);
  });
});
