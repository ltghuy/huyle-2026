"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useWebGLAvailable } from "@/lib/useWebGLAvailable";
import { useInViewport } from "@/lib/useInViewport";

// Next 16 forbids ssr:false in Server Components, so the dynamic import lives in
// this Client Component (same pattern as the Gallery scene). three.js therefore
// loads only when this section nears the viewport, not up front.
const ExperienceGridScene = dynamic(
  () => import("./ExperienceGridScene.client").then((m) => m.ExperienceGridScene),
  { ssr: false },
);

/**
 * Decorative WebGL floor behind the Career & Experience timeline — a perspective
 * grid receding to the horizon at the section's base. Rendered only when WebGL
 * and motion are both available; under reduced motion / no WebGL / no JS the
 * section simply shows its dark ground (the timeline never depends on it).
 */
export function ExperienceGrid() {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLAvailable();
  const live = webgl && !reduced;

  // Defer mounting the scene (and the three.js chunk) until the section is near.
  const [stageRef, inView] = useInViewport<HTMLDivElement>("400px 0px");
  const [mounted, setMounted] = useState(false);
  if (inView && !mounted) setMounted(true);

  return (
    <div
      ref={stageRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[80vh]"
    >
      {live && mounted && <ExperienceGridScene />}
    </div>
  );
}
