"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useScrollProgress } from "@/lib/useScrollProgress";
import { CharacterModel } from "./CharacterModel";
import { CatModel } from "./CatModel";
import { DeskModel } from "./DeskModel";
import { CameraRig } from "./CameraRig";

/**
 * The interactive 3D hero. Loaded client-only (ssr:false) via HeroExperience.
 * Transparent Canvas so the page's dark background + glow show through.
 * Lights only — no external HDR/Environment fetch — to stay self-contained.
 */
export function Scene() {
  const progress = useScrollProgress();

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 7.3], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-2, 3, 2]} intensity={0.4} />
      {/* teal rim light — ties the scene to the palette */}
      <pointLight position={[-4, 2, 3]} color="#d7f24a" intensity={40} distance={22} />

      <Suspense fallback={null}>
        <CharacterModel progress={progress} />
        <DeskModel />
        <CatModel />
        <ContactShadows
          position={[0, -2.4, 0]}
          opacity={0.45}
          scale={12}
          blur={2.4}
          far={4}
          color="#000000"
        />
      </Suspense>

      <CameraRig progress={progress} />
    </Canvas>
  );
}
