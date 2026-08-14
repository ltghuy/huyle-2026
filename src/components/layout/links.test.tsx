import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Inert gsap so Reveal / MagneticLink (used by Contact) don't touch the DOM engine.
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: (fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    },
    fromTo: vi.fn(),
    quickTo: () => vi.fn(),
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { Contact } from "@/components/sections/Contact";
import { socials } from "@/content/socials";

describe("navigation & contact links", () => {
  it("Nav links to every main section", () => {
    const { container } = render(<Nav />);
    ["#hero", "#work", "#about", "#contact"].forEach((href) =>
      expect(container.querySelector(`a[href="${href}"]`)).toBeTruthy(),
    );
  });

  it("Nav is a single labelled control (the editorial pill)", () => {
    const { container } = render(<Nav />);
    const navs = container.querySelectorAll("nav");
    expect(navs).toHaveLength(1);
    expect(navs[0].getAttribute("aria-label")).toBe("Primary");
  });

  it("Footer renders each social with the correct href, and external links carry rel=noopener", () => {
    const { container } = render(<Footer />);
    socials.forEach((s) => {
      const a = container.querySelector<HTMLAnchorElement>(`a[href="${s.href}"]`);
      expect(a).toBeTruthy();
      if (s.icon !== "mail") {
        expect(a?.getAttribute("rel")).toContain("noopener");
        expect(a?.getAttribute("target")).toBe("_blank");
      }
    });
  });

  it("Contact surfaces the email and social profiles", () => {
    const { container } = render(<Contact />);
    const email = socials.find((s) => s.icon === "mail");
    expect(container.querySelector(`a[href="${email?.href}"]`)).toBeTruthy();
    socials
      .filter((s) => s.icon !== "mail")
      .forEach((s) =>
        expect(container.querySelector(`a[href="${s.href}"]`)).toBeTruthy(),
      );
  });
});
