"use client";

import dynamic from "next/dynamic";
import { useWebGLAvailable } from "@/lib/useWebGLAvailable";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { HeroPoster } from "./HeroPoster";

function SceneLoader() {
  return (
    <div className="grid h-full w-full place-items-center" aria-hidden>
      <div className="size-10 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}

// Client-only: Next 16 forbids ssr:false in Server Components, so this wrapper
// (a Client Component) is where the Canvas is dynamically imported.
const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => <SceneLoader />,
});

/**
 * Capability gate for the 3D hero. Renders the live Scene only when WebGL is
 * available and motion is allowed; otherwise the static poster. A loader covers
 * the brief detection + chunk-load window.
 */
export function HeroExperience() {
  const webgl = useWebGLAvailable();
  const reducedMotion = usePrefersReducedMotion();

  if (!webgl || reducedMotion) return <HeroPoster />;
  return <Scene />;
}
