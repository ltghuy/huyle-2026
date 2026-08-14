"use client";

/**
 * A simple desk + monitor built from primitives, set-dressing so the hero reads
 * as a workspace ("character at a desk"). Teal-lit screen nods to the code/
 * health-UI concept without showing anything proprietary. Purely decorative.
 */
export function DeskModel() {
  const wood = "#161d2e";
  const frame = "#0c0f16";

  return (
    <group position={[0, -0.15, 0.95]}>
      {/* desk top */}
      <mesh position={[0, -1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.09, 0.9]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>

      {/* legs */}
      {[
        [-1.3, -0.35],
        [1.3, -0.35],
        [-1.3, 0.35],
        [1.3, 0.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -1.9, z]}>
          <boxGeometry args={[0.08, 1.0, 0.08]} />
          <meshStandardMaterial color={frame} roughness={0.6} />
        </mesh>
      ))}

      {/* monitor — offset to the left so it doesn't occlude the character */}
      <group position={[-0.75, -0.95, -0.05]} scale={0.85}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.9, 0.55, 0.04]} />
          <meshStandardMaterial color={frame} roughness={0.5} />
        </mesh>
        {/* screen — lime glow */}
        <mesh position={[0, 0.28, 0.025]}>
          <planeGeometry args={[0.82, 0.47]} />
          <meshStandardMaterial
            color="#111f0c"
            emissive="#d7f24a"
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* stand */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.08, 0.18, 0.08]} />
          <meshStandardMaterial color={frame} />
        </mesh>
        <mesh position={[0, -0.13, 0]}>
          <boxGeometry args={[0.35, 0.03, 0.2]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      </group>
    </group>
  );
}
