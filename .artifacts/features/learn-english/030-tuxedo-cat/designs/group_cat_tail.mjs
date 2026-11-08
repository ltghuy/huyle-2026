// Puts the tail of the owner's tuxedo_cat.glb under its own node (Tail_Wag), so the home hero (feature 030)
// can swing it while the rest of the cat stays still. Then optimise without flattening, which would join
// the tail into the body:
//   node group_cat_tail.mjs tuxedo_cat.glb grouped.glb   (needs @gltf-transform/core and /extensions v4)
//   npx @gltf-transform/cli@4 optimize grouped.glb tuxedo-cat.glb --flatten false --texture-compress webp --simplify-error 0.001
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [input, output] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

const tail = root.listNodes().find((n) => n.getName() === "Tail");
if (!tail) throw new Error("missing node Tail");
const wag = doc.createNode("Tail_Wag");
scene.addChild(wag);
const parent = tail.getParentNode();
if (parent) parent.removeChild(tail);
else scene.removeChild(tail);
wag.addChild(tail);

await io.write(output, doc);
