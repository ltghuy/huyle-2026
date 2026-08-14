"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { scene as sceneConfig } from "@/content/scene";

interface CharacterModelProps {
  progress: RefObject<number>;
}

/**
 * The hero character. Plays the seated clip by default and crossfades to the
 * standing clip as the visitor scrolls ("the twist"). Currently rendered from a
 * CC0 placeholder GLB — see src/content/scene.ts for the swap.
 */
export function CharacterModel({ progress }: CharacterModelProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(sceneConfig.character);
  const { actions } = useAnimations(animations, group);
  const standing = useRef(false);

  useEffect(() => {
    actions[sceneConfig.clips.seated]?.reset().fadeIn(0.5).play();
    return () => {
      actions[sceneConfig.clips.seated]?.fadeOut(0.2);
    };
  }, [actions]);

  useFrame(() => {
    const p = progress.current ?? 0;
    const wantStanding = p > 0.35;
    if (wantStanding === standing.current) return;
    standing.current = wantStanding;
    const from = wantStanding ? sceneConfig.clips.seated : sceneConfig.clips.stand;
    const to = wantStanding ? sceneConfig.clips.stand : sceneConfig.clips.seated;
    actions[from]?.fadeOut(0.4);
    actions[to]?.reset().fadeIn(0.4).play();
  });

  return (
    <group
      ref={group}
      rotation={[0, sceneConfig.characterRotationY, 0]}
      position={[0, -2.4, 0]}
      scale={0.5}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(sceneConfig.character);
