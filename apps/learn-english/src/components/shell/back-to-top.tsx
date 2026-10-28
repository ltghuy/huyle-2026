"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Scrolled this far (about a screen), the button shows. */
const SHOW_AFTER = 600;

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

/**
 * "Lên đầu trang": a round button in the bottom-right corner once the page is
 * scrolled down (quick 020). On phones it sits above the bottom nav, and above
 * a page's sticky action bar too when the page marks one with `data-bottom-bar`.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SHOW_AFTER);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={scrollToTop}
      className={cn(
        "fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 size-11 rounded-full bg-background/80 shadow-md backdrop-blur transition-opacity md:right-8 md:bottom-8 md:size-10",
        "[body:has([data-bottom-bar])_&]:bottom-[calc(9.25rem+env(safe-area-inset-bottom))] md:[body:has([data-bottom-bar])_&]:bottom-8",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden />
    </Button>
  );
}
