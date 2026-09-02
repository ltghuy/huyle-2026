"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { galleryImages } from "@/content/gallery";
import { GridFloor } from "@/components/three/GridFloor";

/**
 * "Off the clock" — the WebGL gallery as a rotating GLOBE of photo tiles.
 *
 * The photos are spread evenly across a sphere (a Fibonacci lattice), each an
 * upright rounded photo card facing outward, floating above a green perspective floor
 * grid. Grab and drag to spin the globe on both axes; it coasts to a stop and
 * idles with a slow drift. Hovering a tile runs a water-ripple through it from
 * the cursor. Tiles fade out as they turn toward the silhouette, so the far
 * hemisphere reads as the back of a real globe (and their back-faces are culled).
 *
 * Loaded client-only (ssr:false) and only when WebGL + motion are available;
 * otherwise Gallery renders a static scroll-row fallback.
 */

// --- Globe / tile geometry (world units) -----------------------------------
const N = galleryImages.length;
const TILE_COUNT = 6; // photo tiles inside the cage — few + large + well spaced.
//   Each curved card spans a wide angle on the sphere, so the count, TILE_H and
//   PHOTO_R below are balanced (see the geometry note) so cards never overlap:
//   the ~53° gap between neighbours clears each card's ~46° width with margin.
const SPHERE_R = 2.6; // radius of the outer wireframe cage
const PHOTO_R = SPHERE_R * 0.9; // photos live on a sphere just inside the cage —
//                                 pushed out so the large cards stay clear of each other
const TILE_H = 1.5; // tile height — larger cards read more clearly
const TILE_W = TILE_H * (4 / 3); // 4:3 cards
const TILE_ASPECT = TILE_W / TILE_H;
const CARD_RADIUS = 0.08; // rounded-corner radius of the card (tile-height units)

// --- Wireframe vector globe (the outer lat/long cage the photos float inside) --
const WIRE_R = SPHERE_R; // the outer cage; photos orbit on the inner PHOTO_R sphere
const WIRE_LAT = 9; // latitude rings
const WIRE_MERIDIANS = 18; // longitude meridians
const WIRE_SEG = 64; // segments per ring / meridian (silhouette smoothness)

// --- Camera framing --------------------------------------------------------
const FOV = 45; // vertical field of view (deg)
const FILL_V = 0.9; // fraction of the viewport height the globe fills — large,
//                     so the globe dominates the band (turn down to shrink it).
// Distance from the globe centre so its diameter fills FILL_V of the height.
const CAM_DIST = SPHERE_R / (FILL_V * Math.tan((FOV * Math.PI) / 180 / 2));
const CAM_LIFT = 1.9; // raise the camera and look down slightly, to reveal the floor

// --- Floor grid ------------------------------------------------------------
const FLOOR_Y = SPHERE_R + 1.0; // the grid sits this far below the globe centre

// --- Interaction -----------------------------------------------------------
const DRAG_SPEED = 0.006; // radians the globe turns per pixel of drag
const FRICTION = 0.94; // per-frame decay of fling momentum
const IDLE_SPIN = 0.0016; // gentle drift (rad/frame) when left alone
const MAX_PITCH = 1.15; // clamp vertical tilt so the globe never flips over
const HOVER_EASE = 0.12; // how fast the ripple fades in / out
const FADE_START = 0.34; // facing dot below which a tile fades toward the rim

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// A textured quad bent onto the photo sphere so the tile CURVES along the
// globe's surface instead of sitting flat/tangent. The mesh's local +Z is the
// outward normal, so the sphere centre lives at local (0,0,-uPhotoR); every
// vertex of the flat plane is re-projected onto that sphere (its corners recede
// around the curve). The rounded corners + ripple still live in the fragment
// shader; the plane just needs enough segments (below) for a smooth bow.
const TILE_VERT = /* glsl */ `
  uniform float uPhotoR;   // radius of the sphere the tile wraps onto
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 center = vec3(0.0, 0.0, -uPhotoR);
    vec3 curved = center + uPhotoR * normalize(vec3(position.x, position.y, uPhotoR));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(curved, 1.0);
  }
`;

const TILE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uMouse;    // hover point, in uv space
  uniform float uHover;   // 0 → 1 ripple strength
  uniform float uTime;
  uniform float uOpacity;
  uniform float uAspect;  // tile width / height
  uniform float uRadius;  // corner radius, in tile-height units
  varying vec2 vUv;

  // signed distance to a rounded rectangle (p, halfSize in the same space)
  float roundedRectSDF(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - (halfSize - r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 uv = vUv;
    // aspect-correct so the ripple rings stay circular on the tile
    vec2 d = uv - uMouse;
    d.x *= uAspect;
    float dist = length(d);
    float wave = sin(dist * 26.0 - uTime * 7.0);
    float amp = 0.022 * uHover * smoothstep(0.7, 0.0, dist);
    float ring = wave * amp;
    vec2 dir = dist > 1e-4 ? (uv - uMouse) / dist : vec2(0.0);
    vec4 col = texture2D(uTex, uv + dir * ring);
    // wet specular lift on the crests
    col.rgb += ring * 5.0 * 0.16;

    // Rounded-card mask, in tile-height units. A hair of inset from the quad
    // edge leaves room for the anti-aliased border.
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    vec2 halfSize = vec2(uAspect, 1.0) * 0.5 - 0.01;
    float sdf = roundedRectSDF(p, halfSize, uRadius);
    float aa = fwidth(sdf) + 1e-4;
    float mask = 1.0 - smoothstep(-aa, aa, sdf);

    gl_FragColor = vec4(col.rgb, col.a * uOpacity * mask);
  }
`;

// The perspective floor grid beneath the globe lives in the shared
// <GridFloor> component (src/components/three/GridFloor.tsx); it's placed in the
// scene below (position y = -FLOOR_Y).

// Evenly-spaced unit points on a sphere (Fibonacci lattice — no clustering at
// the poles like a naive lat/long grid). Latitudes are sampled at cell MIDPOINTS
// ((i + 0.5) / count) so `y` spans (1 − 1/count) → (−1 + 1/count) and no tile ever
// lands on a pole — a pole tile would face straight up/down and read edge-on.
function fibonacciSphere(count: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2; // (1 − 1/count) → (−1 + 1/count)
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return pts;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
// Orient a tile so its face (+Z) points outward along the sphere normal and its
// up (+Y) points toward world-up — keeping the photos upright, not tumbled.
function orientationFor(normal: THREE.Vector3): THREE.Quaternion {
  const n = normal.clone().normalize();
  const right = new THREE.Vector3().crossVectors(WORLD_UP, n);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0); // at the poles, pick any tangent
  right.normalize();
  const up = new THREE.Vector3().crossVectors(n, right).normalize();
  const m = new THREE.Matrix4().makeBasis(right, up, n);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

// Build the lat/long wireframe of a sphere as line segments — one shared buffer.
function wireframeSphereGeometry(radius: number): THREE.BufferGeometry {
  const pos: number[] = [];
  // latitude rings (skip the exact poles)
  for (let i = 1; i < WIRE_LAT; i++) {
    const phi = (Math.PI * i) / WIRE_LAT;
    const y = radius * Math.cos(phi);
    const r = radius * Math.sin(phi);
    for (let s = 0; s < WIRE_SEG; s++) {
      const a0 = (2 * Math.PI * s) / WIRE_SEG;
      const a1 = (2 * Math.PI * (s + 1)) / WIRE_SEG;
      pos.push(
        r * Math.cos(a0), y, r * Math.sin(a0),
        r * Math.cos(a1), y, r * Math.sin(a1),
      );
    }
  }
  // longitude meridians (pole to pole)
  for (let m = 0; m < WIRE_MERIDIANS; m++) {
    const theta = (2 * Math.PI * m) / WIRE_MERIDIANS;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    for (let s = 0; s < WIRE_SEG; s++) {
      const p0 = (Math.PI * s) / WIRE_SEG;
      const p1 = (Math.PI * (s + 1)) / WIRE_SEG;
      pos.push(
        radius * Math.sin(p0) * ct, radius * Math.cos(p0), radius * Math.sin(p0) * st,
        radius * Math.sin(p1) * ct, radius * Math.cos(p1), radius * Math.sin(p1) * st,
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  return geo;
}

/** The thin accent-green lat/long wireframe sphere — the globe's vector surface.
 *  Lines don't write depth, so both hemispheres read faintly through each other
 *  (a see-through vector globe); the opaque photo tiles occlude the near lines. */
function WireframeGlobe() {
  const geometry = useMemo(() => wireframeSphereGeometry(WIRE_R), []);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#c8e85a"),
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);
  return <lineSegments geometry={geometry} material={material} />;
}

interface Tile {
  material: THREE.ShaderMaterial;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  normal: THREE.Vector3; // base (un-rotated) outward normal
  imageIndex: number;
}

function Globe({ onActive }: { onActive?: (index: number) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl, camera } = useThree();
  const textures = useTexture(galleryImages.map((g) => g.src));

  // One shared quad for every tile (share geometry across meshes — critical for
  // draw-call / VRAM budget), disposed alongside the materials on unmount.
  const geometry = useMemo(
    // Subdivided so the vertex shader can bow the tile smoothly onto the sphere.
    () => new THREE.PlaneGeometry(TILE_W, TILE_H, 20, 16),
    [],
  );

  const tiles = useMemo<Tile[]>(() => {
    const texList = Array.isArray(textures) ? textures : [textures];
    texList.forEach((t) => {
      // Show the photos exactly as-is: NoColorSpace skips the sRGB→linear
      // decode on read, so the pixels reach the sRGB canvas untouched.
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
    });
    return fibonacciSphere(TILE_COUNT).map((p, i) => {
      const normal = p.clone().normalize();
      const material = new THREE.ShaderMaterial({
        vertexShader: TILE_VERT,
        fragmentShader: TILE_FRAG,
        transparent: true,
        uniforms: {
          uTex: { value: texList[i % N] },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uHover: { value: 0 },
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uPhotoR: { value: PHOTO_R },
          uAspect: { value: TILE_ASPECT },
          uRadius: { value: CARD_RADIUS },
        },
      });
      return {
        material,
        position: normal.clone().multiplyScalar(PHOTO_R),
        quaternion: orientationFor(normal),
        normal,
        imageIndex: i % N,
      };
    });
  }, [textures, gl]);

  // Free GPU resources on unmount / rebuild — Three.js never releases geometry
  // or material VRAM on its own. (Textures belong to drei's useTexture cache.)
  useEffect(() => {
    return () => {
      geometry.dispose();
      for (const t of tiles) t.material.dispose();
    };
  }, [tiles, geometry]);

  // Interaction state — refs only touched inside callbacks / useFrame.
  const ctlRef = useRef({
    rotX: -0.12,
    rotY: 0,
    vX: 0,
    vY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const hoverRef = useRef(-1);
  const activeRef = useRef(-1);

  // Scratch vectors reused every frame (never allocate inside useFrame).
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const worldNormal = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const ctl = ctlRef.current;

    // Spin: momentum coasts to a stop, then a gentle idle drift takes over.
    if (!ctl.dragging) {
      ctl.rotY += ctl.vY + IDLE_SPIN;
      ctl.rotX += ctl.vX;
      ctl.vY *= FRICTION;
      ctl.vX *= FRICTION;
      if (Math.abs(ctl.vY) < 1e-5) ctl.vY = 0;
      if (Math.abs(ctl.vX) < 1e-5) ctl.vX = 0;
    }
    ctl.rotX = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, ctl.rotX));
    g.rotation.set(ctl.rotX, ctl.rotY, 0);

    const t = performance.now() / 1000;
    camera.getWorldPosition(camPos);
    for (let i = 0; i < g.children.length; i++) {
      const mesh = g.children[i] as THREE.Mesh;
      const mat = mesh.material as THREE.ShaderMaterial;
      if (!mat.uniforms) continue;
      const n0 = mesh.userData.normal as THREE.Vector3;
      // Tile's live outward normal + world position (group rotates about origin).
      worldNormal.copy(n0).applyQuaternion(g.quaternion);
      worldPos.copy(mesh.position).applyQuaternion(g.quaternion);
      toCam.copy(camPos).sub(worldPos).normalize();
      const facing = worldNormal.dot(toCam); // 1 = square-on, ≤0 = turned away
      mat.uniforms.uOpacity.value = clamp01(facing / FADE_START);
      mat.uniforms.uTime.value = t;
      const hovered = hoverRef.current === i ? 1 : 0;
      mat.uniforms.uHover.value +=
        (hovered - mat.uniforms.uHover.value) * HOVER_EASE;
      mesh.visible = facing > 0.02; // cull the back hemisphere from raycast + draw
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const idx = e.object.userData.index as number;
    hoverRef.current = idx;
    const mat = (e.object as THREE.Mesh).material as THREE.ShaderMaterial;
    if (e.uv) mat.uniforms.uMouse.value.set(e.uv.x, e.uv.y);
    const img = e.object.userData.imageIndex as number;
    if (img !== activeRef.current) {
      activeRef.current = img;
      onActive?.(img);
    }
  };
  const onOut = (e: ThreeEvent<PointerEvent>) => {
    if (hoverRef.current === (e.object.userData.index as number))
      hoverRef.current = -1;
  };

  return (
    <group ref={groupRef}>
      <WireframeGlobe />
      {tiles.map((tile, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={tile.material}
          position={tile.position}
          quaternion={tile.quaternion}
          userData={{ index: i, imageIndex: tile.imageIndex, normal: tile.normal }}
          onPointerMove={onMove}
          onPointerOut={onOut}
        />
      ))}
      <DragController ctlRef={ctlRef} />
    </group>
  );
}

type Ctl = {
  rotX: number;
  rotY: number;
  vX: number;
  vY: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
};

/** Wires two-axis drag/fling on the canvas element to the shared control ref. */
function DragController({ ctlRef }: { ctlRef: RefObject<Ctl> }) {
  const { gl } = useThree();
  const last = useRef({ rotX: 0, rotY: 0 });
  const vel = useRef({ x: 0, y: 0 });

  useFrame(() => {
    const ctl = ctlRef.current;
    if (ctl.dragging) {
      vel.current.x = ctl.rotX - last.current.rotX;
      vel.current.y = ctl.rotY - last.current.rotY;
    }
    last.current.rotX = ctl.rotX;
    last.current.rotY = ctl.rotY;
  });

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      const ctl = ctlRef.current;
      ctl.dragging = true;
      ctl.vX = 0;
      ctl.vY = 0;
      ctl.lastX = e.clientX;
      ctl.lastY = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };
    const onMove = (e: PointerEvent) => {
      const ctl = ctlRef.current;
      if (!ctl.dragging) return;
      ctl.rotY += (e.clientX - ctl.lastX) * DRAG_SPEED; // horizontal drag → yaw
      ctl.rotX += (e.clientY - ctl.lastY) * DRAG_SPEED; // vertical drag → pitch
      ctl.lastX = e.clientX;
      ctl.lastY = e.clientY;
    };
    const onUp = () => {
      const ctl = ctlRef.current;
      if (!ctl.dragging) return;
      ctl.dragging = false;
      ctl.vX = vel.current.x;
      ctl.vY = vel.current.y;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl, ctlRef]);

  return null;
}

/** Aim the camera slightly below centre so the globe floats above the grid.
 *  (Its position is set once by the <Canvas camera> prop; only the lookAt —
 *  which the prop can't express — needs a rig.) */
function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, -0.2, 0);
  }, [camera]);
  return null;
}

export function GalleryScene({
  onActive,
  active = true,
}: {
  onActive?: (index: number) => void;
  /** Drive the render loop only while the gallery is on-screen — a globe that
   *  keeps rendering at 60fps behind other sections wastes the GPU and steals
   *  frames from scrolling. `never` freezes the last frame (unseen off-screen). */
  active?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, CAM_LIFT, CAM_DIST], fov: FOV }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <CameraRig />
      <Suspense fallback={null}>
        <GridFloor position={[0, -FLOOR_Y, 0]} />
        <Globe onActive={onActive} />
      </Suspense>
    </Canvas>
  );
}
