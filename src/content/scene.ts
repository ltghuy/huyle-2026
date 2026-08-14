/**
 * 3D scene configuration. The `character` currently points at a CC0 placeholder
 * (three.js RobotExpressive). When the real Meshy "Huy" model is ready, swap the
 * path + clip map here — no other code should need to change. See
 * public/assets/models/README.md for the swap steps.
 */
export interface SceneClipMap {
  /** Seated at the desk (hero default) */
  seated: string;
  /** Stands up — driven by scroll progress ("the twist") */
  stand: string;
  /** Idle loop */
  idle: string;
  /** Locomotion */
  walk: string;
  /** Delight / easter-egg reaction */
  wave: string;
}

export interface SceneConfig {
  character: string;
  clips: SceneClipMap;
  /** Bông the cat (pending — proxy until a real model exists) */
  cat: string;
  /** Static hero fallback still (no WebGL / reduced-motion / mobile) */
  poster: string;
  /** Default facing correction for Meshy/placeholder GLBs (radians) */
  characterRotationY: number;
}

export const scene: SceneConfig = {
  character: "/assets/models/placeholder-character.glb",
  clips: {
    seated: "Sitting",
    stand: "Standing",
    idle: "Idle",
    walk: "Walking",
    wave: "Wave",
  },
  cat: "/assets/models/bong.glb",
  poster: "/assets/images/hero-poster.webp",
  characterRotationY: Math.PI,
};
