"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/**
 * GSAP ScrollSmoother — inertial "smooth scrolling" for the whole page
 * (à la https://demos.gsap.com/demo/smooth-scrolling/).
 *
 * ScrollSmoother wraps the scrolling content in `#smooth-wrapper > #smooth-content`
 * and drives it with a lerped `transform` while the native scrollbar stays in
 * sync. Because that transform makes `#smooth-content` a containing block for
 * `position: fixed`, anything that must stay viewport-fixed (Nav, the scroll
 * portrait, the intro overlay) is rendered OUTSIDE this wrapper in the layout —
 * only in-flow, scrolling content lives inside.
 *
 * Under reduced motion (or no JS) we skip `create()` entirely: the wrapper/content
 * are then just plain divs and the page scrolls natively. All existing
 * ScrollTriggers (hero portrait journey, pinned gallery) integrate automatically
 * once the smoother owns the scroll — `create()` refreshes them.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.2, // seconds it takes to "catch up" to native scroll position
      smoothTouch: 0.1, // a light touch of smoothing on touch devices (0 = native)
      effects: true, // enable data-speed / data-lag parallax attributes
    });

    // Native in-page anchor jumps don't work under ScrollSmoother: the target
    // lives inside the fixed, transformed #smooth-content, so the browser can't
    // scroll the window to it. Route same-page hash links through the smoother
    // (which drives the real scroll), landing the target below the fixed nav.
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      // Dynamic-island (primary nav) clicks JUMP instantly — a smooth scroll
      // would scrub straight through #about's tall scroll-hijack track and play
      // the whole portrait/zoom/chapter effect on the way. Other in-page anchors
      // keep the smooth glide.
      const inIsland = !!anchor.closest('nav[aria-label="Primary"]');
      smoother.scrollTo(target, !inIsland, "top 90px");
      history.pushState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      smoother.kill();
    };
  }, [reduced]);

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}
