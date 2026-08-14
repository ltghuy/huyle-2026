import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Inert gsap for the Reveal wrapper.
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: (fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    },
    fromTo: vi.fn(),
  },
}));
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
