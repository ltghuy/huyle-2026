// The home hero's 3D owl (feature 021, AC-003–AC-005). Loaded on demand by OwlShowcase, so three.js
// never reaches other pages. It stands still and glances left and right with its pupils (unless motion is
// reduced), turns when dragged, and draws no frames off-screen.
import { AmbientLight, DirectionalLight, HemisphereLight, NoToneMapping, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer, Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface OwlScene {
  dispose: () => void;
}

/** How far the pupils turn each way, in radians, and the seconds a look left and back right takes. */
const GAZE_ANGLE = 0.22;
const GAZE_PERIOD = 6;
/** How sharply a glance moves: higher means a quicker move and a longer rest on each side. */
const GAZE_SNAP = 2.5;
/**
 * The pupils turn around a point this far behind their centre (model units), the centre of curvature of
 * the white at its front, so they slide along the eye instead of sinking into it or floating off it.
 */
const GAZE_PIVOT_DEPTH = 0.315;
/** Half the pupil's depth: from the back of an eye's Gaze node to the pupil's centre (`build_owl.py`). */
const PUPIL_HALF_DEPTH = 0.06;

/**
 * Wraps each eye's `Gaze_L` / `Gaze_R` node (pupil and highlights, kept apart by `group_owl_eyes.mjs`)
 * in a pivot behind it, and returns the pivots. Call before the owl is moved: it reads world positions.
 */
function gazePivots(owl: Object3D): Object3D[] {
  return ["Gaze_L", "Gaze_R"].flatMap((name) => {
    const gaze = owl.getObjectByName(name);
    if (!gaze?.parent) return [];
    const box = new Box3().setFromObject(gaze);
    const pivot = new Object3D();
    pivot.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z + PUPIL_HALF_DEPTH - GAZE_PIVOT_DEPTH);
    gaze.parent.add(pivot);
    pivot.attach(gaze);
    return [pivot];
  });
}

/**
 * Renders the owl from `model` (the GLB, fetched by OwlShowcase alongside this module) into `container`;
 * resolves once the first frame is drawn, rejects if the model can't be parsed.
 */
export async function mountOwlScene(container: HTMLElement, { look, model }: { look: boolean; model: ArrayBuffer }): Promise<OwlScene> {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0xb9a7ef, 1.6));
  scene.add(new AmbientLight(0xffffff, 0.6));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new DirectionalLight(0xd9ccff, 1);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try {
    gltf = await loader.parseAsync(model, "");
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  const owl = gltf.scene;
  scene.add(owl);
  const pivots = gazePivots(owl);

  // Frame the model: about 2 units tall, feet on y = 0, facing +Z.
  const box = new Box3().setFromObject(owl);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  // A little headroom around the owl.
  const distance = (size.y / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.12;
  camera.position.set(center.x, center.y + size.y * 0.04, center.z + distance);

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.cursor = "grab";
  container.appendChild(canvas);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  // Turn around the vertical axis only, and leave vertical swipes to the page.
  controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2 - 0.08;
  canvas.style.touchAction = "pan-y";
  controls.update();

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const start = performance.now();
  function frame() {
    if (look) {
      const wave = Math.sin(((performance.now() - start) / 1000) * ((2 * Math.PI) / GAZE_PERIOD));
      const angle = (Math.tanh(GAZE_SNAP * wave) / Math.tanh(GAZE_SNAP)) * GAZE_ANGLE;
      for (const pivot of pivots) pivot.rotation.y = angle;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  frame();
  // Draw only while the hero is on screen.
  const visibility = new IntersectionObserver(([entry]) => renderer.setAnimationLoop(entry?.isIntersecting ? frame : null));
  visibility.observe(container);

  return {
    dispose() {
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      owl.traverse((node) => {
        const mesh = node as { geometry?: { dispose: () => void }; material?: { dispose: () => void } | { dispose: () => void }[] };
        mesh.geometry?.dispose();
        for (const material of [mesh.material].flat()) material?.dispose();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
