"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Home,
  User,
  Quote,
  Camera,
  Layers,
  Briefcase,
  Rocket,
  Mail,
  type LucideIcon,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile } from "@/content/profile";
import { EVAN_MARK } from "@/lib/evanMark";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// Editorial re-style (feature 002): one centered floating glass pill. It now
// behaves like an Apple "dynamic island" (à la smoothui.dev) — a status segment
// in the middle reflects the section you're currently viewing and morphs (width
// springs, icon + label crossfade, the pill pops) as you scroll between them.
const LINKS = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

/**
 * Sections the island reflects, in document order. Each `id` must match a real
 * `<section id>` on the page; the scroll-spy activates whichever owns the
 * viewport centre.
 */
const SECTIONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "hero", label: "Home", Icon: Home },
  { id: "about", label: "About", Icon: User },
  { id: "statement", label: "Ethos", Icon: Quote },
  { id: "gallery", label: "Gallery", Icon: Camera },
  { id: "what-i-do", label: "Capabilities", Icon: Layers },
  { id: "experience", label: "Career", Icon: Briefcase },
  { id: "work", label: "Work", Icon: Rocket },
  { id: "contact", label: "Contact", Icon: Mail },
];

const linkClass =
  "font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-fg-muted transition-colors duration-200 hover:text-accent sm:text-xs";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Nav() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);

  const islandRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevWidth = useRef(0);

  // Scroll-spy: activate whichever section currently spans the viewport centre.
  // Runs through ScrollTrigger, so it stays in sync with ScrollSmoother.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const triggers = SECTIONS.map((s, i) => {
      const el = document.getElementById(s.id);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) setActive(i);
        },
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, []);

  // Dynamic-island morph on section change: the status width springs from its
  // previous size to the new content, the icon + label crossfade in, and the
  // whole pill gives a subtle pop. Skipped (instant swap) under reduced motion.
  useIsomorphicLayoutEffect(() => {
    const status = statusRef.current;
    if (!status) return;
    const next = status.offsetWidth;
    const prev = prevWidth.current;
    prevWidth.current = next;
    if (reduced || prev === 0 || prev === next) return;

    gsap.fromTo(
      status,
      { width: prev },
      {
        width: next,
        duration: 0.5,
        ease: "back.out(1.6)",
        onComplete: () => gsap.set(status, { width: "auto" }),
      },
    );
    gsap.fromTo(
      contentRef.current,
      { autoAlpha: 0, yPercent: 45, filter: "blur(4px)" },
      { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
    );
    gsap.fromTo(
      islandRef.current,
      { scale: 0.97 },
      { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.6)" },
    );
  }, [active, reduced]);

  const { label, Icon } = SECTIONS[active];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4 sm:py-6">
      <nav
        ref={islandRef}
        aria-label="Primary"
        className="glass group pointer-events-auto flex items-center gap-3 rounded-full px-3 py-2 shadow-md will-change-transform sm:gap-4 sm:px-4"
      >
        {/* The Evan wordmark — home */}
        <a
          href="#hero"
          aria-label={`${profile.display} — home`}
          className="shrink-0 transition-opacity duration-200 hover:opacity-80"
        >
          <svg
            data-nav-logo
            viewBox={EVAN_MARK.viewBox}
            aria-hidden
            className="h-7 w-auto sm:h-8"
            style={{ filter: "drop-shadow(0 0 10px rgba(215,242,74,0.25))" }}
          >
            <path
              d={EVAN_MARK.path}
              fill="none"
              stroke={EVAN_MARK.ink}
              strokeWidth={EVAN_MARK.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        {/* Hairline divider (only alongside the status segment) */}
        <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />

        {/* Dynamic-island status — the section you're currently viewing.
            This is the island's COMPACT face; it's always shown (sm+). */}
        <div
          ref={statusRef}
          role="status"
          aria-live="polite"
          className="hidden overflow-hidden sm:block"
        >
          <div
            ref={contentRef}
            className="flex items-center gap-2 whitespace-nowrap pr-1"
          >
            <Icon className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-fg sm:text-xs">
              {label}
            </span>
          </div>
        </div>

        {/* Links — the EXPANDED face. Always visible up to lg; on lg+ they
            collapse to the compact island and spring open on hover (or when a
            link is keyboard-focused, via focus-within, so they stay reachable). */}
        <div className="flex items-center gap-4 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:gap-5 lg:max-w-0 lg:-translate-x-2 lg:overflow-hidden lg:opacity-0 lg:group-hover:max-w-[24rem] lg:group-hover:translate-x-0 lg:group-hover:opacity-100 lg:focus-within:max-w-[24rem] lg:focus-within:translate-x-0 lg:focus-within:opacity-100">
          <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
          <ul className="flex items-center gap-4 sm:gap-5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={linkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
