#!/usr/bin/env node
// Zero-dependency Meshy AI pipeline helper (image-to-3d / rig / animate / status).
// Implements the endpoints from the meshyai skill's api-reference.md.
// Usage examples:
//   node scripts/meshy.mjs --mode image-to-3d --image <path> --slug huy --output public/assets/models
//   node scripts/meshy.mjs --mode rig --task-id <id> --height 1.75 --slug huy --output public/assets/models
//   node scripts/meshy.mjs --mode status --task-id <id> --task-type image-to-3d

import fs from "node:fs";
import path from "node:path";

const API = "https://api.meshy.ai/openapi";
const KEY = process.env.MESHY_API_KEY;
if (!KEY) {
  console.error("MESHY_API_KEY not set");
  process.exit(1);
}

// ---- arg parsing ----
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = process.argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
}

const headers = {
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function get(url) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function poll(getUrl, label, timeoutMs = 15 * 60 * 1000) {
  const start = Date.now();
  let last = -1;
  while (Date.now() - start < timeoutMs) {
    const t = await get(getUrl);
    if (t.progress !== last) {
      console.log(`[${label}] ${t.status} ${t.progress ?? 0}%`);
      last = t.progress;
    }
    if (t.status === "SUCCEEDED") return t;
    if (t.status === "FAILED" || t.status === "CANCELED")
      throw new Error(`[${label}] ${t.status}: ${JSON.stringify(t.task_error || t)}`);
    await sleep(5000);
  }
  throw new Error(`[${label}] timed out`);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`saved ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
  return dest;
}

function toDataUri(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  const b64 = fs.readFileSync(file).toString("base64");
  return `data:image/${mime};base64,${b64}`;
}

const out = args.output || "public/assets/models";
const slug = args.slug || "model";

async function main() {
  if (args.mode === "image-to-3d") {
    const image = args.image.startsWith("http") ? args.image : toDataUri(args.image);
    console.log(`Submitting image-to-3d for ${slug}...`);
    const { result: id } = await post(`${API}/v1/image-to-3d`, {
      image_url: image,
      ai_model: "latest",
      enable_pbr: false,
      should_texture: true,
      topology: "triangle",
      target_polycount: Number(args.polycount) || 12000,
    });
    console.log("task id:", id);
    const t = await poll(`${API}/v1/image-to-3d/${id}`, "image-to-3d");
    await download(t.model_urls.glb, path.join(out, `${slug}.glb`));
    if (t.thumbnail_url) await download(t.thumbnail_url, path.join(out, `${slug}.thumbnail.png`));
    fs.writeFileSync(
      path.join(out, `${slug}.meta.json`),
      JSON.stringify({ mode: "image-to-3d", imageTaskId: id, model_urls: t.model_urls, thumbnail_url: t.thumbnail_url }, null, 2)
    );
    console.log("DONE image-to-3d. imageTaskId=", id);
  } else if (args.mode === "rig") {
    console.log(`Submitting rigging for ${slug} (input ${args["task-id"]})...`);
    const { result: id } = await post(`${API}/v1/rigging`, {
      input_task_id: args["task-id"],
      height_meters: Number(args.height) || 1.75,
    });
    console.log("rig task id:", id);
    const t = await poll(`${API}/v1/rigging/${id}`, "rigging");
    const glbUrl = t.rigged_character_glb_url || t.model_urls?.glb;
    if (glbUrl) await download(glbUrl, path.join(out, `${slug}.glb`));
    const anims = t.basic_animations || {};
    for (const [name, url] of Object.entries(anims)) {
      if (typeof url === "string" && url.startsWith("http"))
        await download(url, path.join(out, `${slug}-${name}.glb`));
    }
    fs.writeFileSync(
      path.join(out, `${slug}.rig.meta.json`),
      JSON.stringify({ mode: "rig", rigTaskId: id, rigged: glbUrl, basic_animations: anims }, null, 2)
    );
    console.log("DONE rig. rigTaskId=", id);
  } else if (args.mode === "status") {
    const type = args["task-type"] || "image-to-3d";
    const map = { "image-to-3d": "v1/image-to-3d", "text-to-3d": "v2/text-to-3d", rigging: "v1/rigging", animations: "v1/animations" };
    const t = await get(`${API}/${map[type]}/${args["task-id"]}`);
    console.log(JSON.stringify(t, null, 2));
  } else {
    console.error("unknown --mode:", args.mode);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
