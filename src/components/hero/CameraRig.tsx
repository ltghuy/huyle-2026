"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";

interface CameraRigProps {
  progress: RefObject<number>;
}

/**
 * Drives the camera: pointer parallax (leans toward the cursor) plus subtle
 * scroll-progress staging (pulls in a touch as the character stands).
 */
export function CameraRig({ progress }: CameraRigProps) {
  useFrame((state) => {
    const p = progress.current ?? 0;
    const cam = state.camera;

    const targetX = state.pointer.x * 0.6;
    const targetY = 0.4 + state.pointer.y * 0.3 - p * 0.15;
    const targetZ = 7.3 - p * 0.8;

    cam.position.x += (targetX - cam.position.x) * 0.05;
    cam.position.y += (targetY - cam.position.y) * 0.05;
    cam.position.z += (targetZ - cam.position.z) * 0.05;
    cam.lookAt(0, -0.2, 0);
  });

  return null;
}
