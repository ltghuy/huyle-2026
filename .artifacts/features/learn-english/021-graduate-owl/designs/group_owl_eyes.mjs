// Groups each eye's pupil and highlights of the owner's graduate_owl.glb under its own node (Gaze_L, Gaze_R),
// so the home hero (feature 021) can move the pupils while the body stays still. Then optimise without
// flattening, which would undo the grouping:
//   node group_owl_eyes.mjs graduate_owl.glb grouped.glb   (needs @gltf-transform/core and /extensions v4)
//   npx @gltf-transform/cli@4 optimize grouped.glb graduate-owl.glb --flatten false --texture-compress false --simplify-error 0.001
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [input, output] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

for (const side of ["L", "R"]) {
  const gaze = doc.createNode(`Gaze_${side}`);
  scene.addChild(gaze);
  for (const name of [`Pupil_${side}`, `Highlight_${side}`, `HighlightSm_${side}`]) {
    const node = root.listNodes().find((n) => n.getName() === name);
    if (!node) throw new Error(`missing node ${name}`);
    scene.removeChild(node);
    gaze.addChild(node);
  }
}

await io.write(output, doc);
