// The home hero's 3D owl (feature 021, AC-003–AC-005). Loaded on demand by OwlShowcase, so three.js
// never reaches other pages. It sways gently to keep its face to the learner (unless motion is reduced),
// turns when dragged, and draws no frames off-screen.
import { AmbientLight, DirectionalLight, HemisphereLight, NoToneMapping, PerspectiveCamera, Scene, Vector3, WebGLRenderer, Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export const OWL_MODEL_URL = "/models/graduate-owl.glb";

export interface OwlScene {
  dispose: () => void;
}

/** Peak of the idle sway, in radians (about 25°), and its speed. */
const SWAY_ANGLE = 0.44;
const SWAY_SPEED = 0.7;

/** Renders the owl into `container`; resolves once the first frame is drawn, rejects if the model can't load. */
export async function mountOwlScene(container: HTMLElement, { sway }: { sway: boolean }): Promise<OwlScene> {
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
    gltf = await loader.loadAsync(OWL_MODEL_URL);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  const owl = gltf.scene;
  scene.add(owl);

  // Frame the model: about 2 units tall, feet on y = 0, facing +Z.
  const box = new Box3().setFromObject(owl);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  // A little headroom around the owl; the sway still fits.
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
    if (sway) owl.rotation.y = Math.sin(((performance.now() - start) / 1000) * SWAY_SPEED) * SWAY_ANGLE;
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
