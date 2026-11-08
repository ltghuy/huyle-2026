// The home hero's 3D cat (feature 030 AC-003 to AC-005, after 021). Loaded on demand by MascotShowcase, so
// three.js never reaches other pages. It stands still and wags its tail left and right (unless motion is
// reduced), turns when dragged, and draws no frames off-screen.
import { AmbientLight, DirectionalLight, HemisphereLight, NoToneMapping, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer, Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface MascotScene {
  dispose: () => void;
}

/** Where the tail joins the body (`build_tuxedo_cat.py`: the first point of `tail_pts`), in model units. */
const TAIL_BASE = new Vector3(0.08, 0.06, -0.18);
/**
 * The tail swings around the axis facing the learner, so it sweeps left and right as seen from the front,
 * from TAIL_REST - TAIL_SWING (out to the right) to TAIL_REST + TAIL_SWING (in toward the body), in radians.
 * Past about +0.1 it disappears behind the body, so the swing stays on the visible side.
 */
const TAIL_REST = -0.15;
const TAIL_SWING = 0.25;
/** Seconds for one swing out and back. */
const TAIL_PERIOD = 1.6;

/**
 * Wraps the `Tail_Wag` node (the tail, kept apart by `group_cat_tail.mjs`) in a pivot at the tail's base and
 * returns it. Call before the model is moved: the node sits at the model's origin.
 */
function tailPivot(model: Object3D): Object3D | null {
  const tail = model.getObjectByName("Tail_Wag");
  if (!tail?.parent) return null;
  const pivot = new Object3D();
  pivot.position.copy(TAIL_BASE);
  tail.parent.add(pivot);
  pivot.attach(tail);
  return pivot;
}

/**
 * Renders the cat from `model` (the GLB, fetched by MascotShowcase alongside this module) into `container`;
 * resolves once the first frame is drawn, rejects if the model can't be parsed.
 */
export async function mountMascotScene(container: HTMLElement, { wag, model }: { wag: boolean; model: ArrayBuffer }): Promise<MascotScene> {
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
  const mascot = gltf.scene;
  scene.add(mascot);
  const tail = tailPivot(mascot);
  if (tail) tail.rotation.z = TAIL_REST;

  // Frame the model: about 1 unit tall, feet on y = 0, facing +Z.
  const box = new Box3().setFromObject(mascot);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  // A little headroom around the cat.
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
    if (wag && tail) {
      const t = (performance.now() - start) / 1000;
      tail.rotation.z = TAIL_REST + TAIL_SWING * Math.sin(t * ((2 * Math.PI) / TAIL_PERIOD));
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
      mascot.traverse((node) => {
        const mesh = node as { geometry?: { dispose: () => void }; material?: { dispose: () => void } | { dispose: () => void }[] };
        mesh.geometry?.dispose();
        for (const material of [mesh.material].flat()) material?.dispose();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
