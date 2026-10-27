"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Full-screen layer for an exercise run: covers the sidebar and bottom nav
 * (focus mode, design.md) and stops the page behind it from scrolling.
 */
export function FocusOverlay({ label, children }: { label: string; children: ReactNode }) {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div role="region" aria-label={label} className="fixed inset-0 z-50 overflow-y-auto bg-background">
      {children}
    </div>
  );
}
