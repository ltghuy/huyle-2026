import "server-only";

import { setTimeout as sleep } from "node:timers/promises";

import { ASSET_DELAY, type AssetParams, type LoadSetup, type ScriptMode } from "./render-lab.schema";

const NO_STORE = { "Cache-Control": "no-store" };

// Runs first in <head>, before the stylesheet, so nothing blocks it. Collects
// events, then at load adds Resource and Paint Timing and posts one report.
function logger(run: string) {
  return `<script>
(() => {
  const events = [];
  let hidden = document.visibilityState !== "visible";
  document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") hidden = true; });
  window.__log = (kind, name) => events.push({ kind, name, t: performance.now(), sawContent: name && kind === "ran" ? !!document.getElementById("content") : undefined });
  document.addEventListener("readystatechange", () => { if (document.readyState === "interactive") __log("interactive"); });
  document.addEventListener("DOMContentLoaded", () => __log("dcl"));
  addEventListener("load", () => {
    __log("load");
    // Paint entries can land a frame after load.
    requestAnimationFrame(() => setTimeout(() => {
      const resources = performance.getEntriesByType("resource")
        .map((e) => ({ name: new URL(e.name).searchParams.get("name"), start: e.startTime, end: e.responseEnd }))
        .filter((e) => e.name);
      const paint = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint")
        ?? performance.getEntriesByType("paint").find((e) => e.name === "first-paint");
      parent.postMessage({ type: "render-lab-report", run: ${JSON.stringify(run)}, events, resources, firstPaint: paint ? paint.startTime : null, hidden }, location.origin);
    }, 50));
  });
})();
</script>`;
}

function assetUrl(run: string, name: "a" | "b" | "css", delay: number) {
  return `/api/handbook/render/asset?run=${run}&amp;name=${name}&amp;delay=${delay}`;
}

function scriptTag(run: string, name: "a" | "b", mode: ScriptMode) {
  const attrs = mode === "defer" ? " defer" : mode === "async" ? " async" : mode === "module" ? ' type="module"' : "";
  return `<script${attrs} src="${assetUrl(run, name, ASSET_DELAY[name])}" onerror="__log('error','${name}')"></script>`;
}

/** The sample page for the script-loading demo, built only from validated enums. */
export function samplePage(setup: LoadSetup): Response {
  const { run, css, a, b, inline } = setup;
  const scripts = [
    { name: "a" as const, mode: a },
    { name: "b" as const, mode: b },
  ];
  const inHead = scripts.filter((s) => s.mode !== "body-end").map((s) => scriptTag(run, s.name, s.mode));
  const atEnd = scripts.filter((s) => s.mode === "body-end").map((s) => scriptTag(run, s.name, s.mode));

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sample page</title>
${logger(run)}
<style>body{margin:0;padding:12px;font:14px/1.4 system-ui,sans-serif;background:#fff;color:#111}h1{font-size:16px;margin:0 0 6px}p{margin:0}</style>
${css === "none" ? "" : `<link rel="stylesheet" href="${assetUrl(run, "css", ASSET_DELAY.css[css])}" onerror="__log('error','css')">`}
${inline === "1" ? `<script>__log("ran","inline")</script>` : ""}
${inHead.join("\n")}
</head>
<body>
<h1>Sample article</h1>
<p id="content">The article text, after the scripts in the head.</p>
${atEnd.join("\n")}
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE } });
}

/** A stylesheet or script that arrives after `delay` ms. */
export async function slowAsset({ name, delay }: AssetParams): Promise<Response> {
  await sleep(delay);
  if (name === "css") {
    return new Response("h1{color:#1d4ed8}", { headers: { "Content-Type": "text/css", ...NO_STORE } });
  }
  return new Response(`__log("ran", ${JSON.stringify(name)});`, {
    headers: { "Content-Type": "text/javascript", ...NO_STORE },
  });
}
