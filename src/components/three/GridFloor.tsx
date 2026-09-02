import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Perspective floor grid (à la jesperlandberg.com) — a horizontal plane drawn as
 * an anti-aliased line grid that recedes toward the vanishing point and fades
 * into the dark background with distance, tinted to the site's accent green.
 *
 * Shared by the Gallery globe (a floor beneath the sphere) and the Career &
 * Experience section (an ambient ground behind the timeline). Only ever mounted
 * inside an R3F <Canvas> from a client-only, dynamically-imported scene, so
 * three.js stays out of the main bundle.
 */
const GRID_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const GRID_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  uniform vec3 uColor;
  uniform float uSpacing; // grid cell size (world units)
  uniform float uNear;    // distance where the grid is at full strength
  uniform float uFar;     // distance where the grid has faded to nothing
  void main() {
    vec2 coord = vWorld.xz / uSpacing;
    vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float fade = smoothstep(uFar, uNear, length(vWorld.xz));
    float alpha = line * fade * 0.5;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function GridFloor({
  color = "#c8e85a",
  spacing = 1.4,
  near = 6,
  far = 80,
  size = 220,
  position = [0, 0, 0],
  renderOrder = -1,
}: {
  /** Line colour (faint accent green by default). */
  color?: string;
  /** Grid cell size in world units. */
  spacing?: number;
  /** Distance (from origin, on xz) where lines are at full strength. */
  near?: number;
  /** Distance where lines have faded to nothing. */
  far?: number;
  /** Side length of the (square) plane. */
  size?: number;
  /** Plane position; y sets the floor height. */
  position?: [number, number, number];
  renderOrder?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uSpacing: { value: spacing },
          uNear: { value: near },
          uFar: { value: far },
        },
      }),
    [color, spacing, near, far],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh
      material={material}
      rotation-x={-Math.PI / 2}
      position={position}
      renderOrder={renderOrder}
    >
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
