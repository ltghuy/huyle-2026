import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Inert gsap so HeroScrollSpine's effect doesn't touch the real engine.
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: (fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    },
    set: vi.fn(),
    to: vi.fn(),
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { refresh: vi.fn() } }));

import { Hero } from "./Hero";
import { profile } from "@/content/profile";

describe("Hero (editorial type-as-spine)", () => {
  it("exposes a single h1 with the accessible name, and the title as text", () => {
    const { container } = render(<Hero />);
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain(profile.display);
    // Title is present in the section as readable text (subtitle).
    expect(container.querySelector("section#hero")?.textContent).toContain(
      profile.title,
    );
  });

  it("is a reachable in-page destination (#hero anchor target)", () => {
    const { container } = render(<Hero />);
    expect(container.querySelector("section#hero")).toBeTruthy();
  });

  it("renders decorative runner labels marked aria-hidden", () => {
    const { container } = render(<Hero />);
    const runners = [...container.querySelectorAll(".runner-label")];
    expect(runners.length).toBeGreaterThanOrEqual(1);
    const monogram = runners.find((el) => el.textContent === profile.monogram);
    expect(monogram).toBeTruthy();
    expect(monogram?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders without WebGL (static fallback path, no scene crash)", () => {
    // happy-dom has no WebGL context, so HeroExperience must take the poster
    // branch rather than importing the Three.js Scene.
    expect(() => render(<Hero />)).not.toThrow();
  });
});
