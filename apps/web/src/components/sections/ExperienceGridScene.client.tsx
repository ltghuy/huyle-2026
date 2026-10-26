"use client";

import { Canvas } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { GridFloor } from "@/components/three/GridFloor";

/**
 * Ambient WebGL floor for the Career & Experience section — the same shader
 * <GridFloor> used beneath the Gallery globe, seen from a low camera skimming the
 * plane toward the horizon so the accent-green lines recede to a vanishing point
 * and dissolve into the dark. Purely decorative background behind the timeline.
 *
 * Static: the camera and grid never move, so the canvas renders once
 * (frameloop="demand") — zero ongoing GPU cost. Loaded client-only (ssr:false)
 * and only mounted when WebGL + motion are available and the section nears view
 * (see ExperienceGrid.client).
 */
export function ExperienceGridScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 2, 4.2], fov: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => {
        // Skim the floor toward a distant horizon (the <Canvas camera> prop can
        // set position/fov but not the lookAt).
        (camera as PerspectiveCamera).lookAt(0, 0, -22);
      }}
    >
      <GridFloor position={[0, 0, 0]} near={6} far={45} spacing={1.5} size={200} />
    </Canvas>
  );
}
