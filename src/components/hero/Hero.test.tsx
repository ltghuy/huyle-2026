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

  it("renders the two decorative corner elements, aria-hidden", () => {
    const { container } = render(<Hero />);
    const copyright = container.querySelector("[data-hero-copyright]");
    const since = container.querySelector(".runner-label");
    expect(copyright?.textContent).toMatch(/©\d{4}/);
    expect(copyright?.getAttribute("aria-hidden")).toBe("true");
    expect(since?.textContent).toMatch(/engineering since/i);
    expect(since?.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render the removed center identity block", () => {
    const { container } = render(<Hero />);
    // Name/title live in the sr-only h1 + nav now; no visible eyebrow duplicate.
    expect(container.querySelector(".eyebrow")).toBeNull();
  });

  it("renders the interim portrait centerpiece", () => {
    // The static portrait stands in for the 3D scene; it needs no WebGL and must
    // always render inside the hero.
    const { container } = render(<Hero />);
    expect(container.querySelector("#hero img")).toBeTruthy();
  });
});
