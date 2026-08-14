"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Bông — the tuxedo cat companion. Rendered from primitives as a placeholder
 * until a real model exists (Meshy auto-rig is humanoid-only, so the cat is
 * hand-built / proxied). Idle tail flick + hover/click reactions.
 */
export function CatModel() {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hop = useRef(0);
  const baseY = -2.15;
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (tail.current) tail.current.rotation.z = 0.5 + Math.sin(t * 2.5) * 0.35;

    if (group.current) {
      const s = hovered ? 1.12 : 1;
      targetScale.current.set(s, s, s);
      group.current.scale.lerp(targetScale.current, 0.12);

      if (hop.current > 0) {
        hop.current = Math.max(0, hop.current - 0.04);
        group.current.position.y = baseY + Math.sin((1 - hop.current) * Math.PI) * 0.18;
      } else {
        group.current.position.y = baseY;
      }
      // gentle look toward pointer
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        state.pointer.x * 0.3,
        0.06,
      );
    }
  });

  const dark = "#0e0e12";
  const white = "#f2f4f8";

  return (
    <group
      ref={group}
      position={[1.05, baseY, 0.8]}
      scale={0.7}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        hop.current = 1;
      }}
    >
      {/* body */}
      <mesh position={[0, 0.28, 0]} scale={[1, 1.15, 1.25]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      {/* white chest (tuxedo) */}
      <mesh position={[0, 0.24, 0.22]} scale={[0.7, 1, 0.5]}>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshStandardMaterial color={white} roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.62, 0.12]}>
        <sphereGeometry args={[0.19, 24, 24]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      {/* muzzle white */}
      <mesh position={[0, 0.56, 0.28]} scale={[0.8, 0.6, 0.5]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={white} roughness={0.6} />
      </mesh>
      {/* ears */}
      <mesh position={[-0.11, 0.78, 0.1]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.07, 0.14, 12]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      <mesh position={[0.11, 0.78, 0.1]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.07, 0.14, 12]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      {/* eyes — teal glow, on-theme */}
      <mesh position={[-0.07, 0.63, 0.28]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#d7f24a" emissive="#d7f24a" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.07, 0.63, 0.28]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#d7f24a" emissive="#d7f24a" emissiveIntensity={2} />
      </mesh>
      {/* tail */}
      <mesh ref={tail} position={[-0.24, 0.2, -0.12]}>
        <cylinderGeometry args={[0.035, 0.05, 0.5, 12]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
    </group>
  );
}
