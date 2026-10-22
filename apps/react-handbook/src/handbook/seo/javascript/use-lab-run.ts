"use client";

import { useState } from "react";

import { labPath, type LabSlug } from "./labs";
import { type Rendered, renderInFrame, type Snapshot, snapshotHtml } from "./render-frame";

export type LabRun = { state: "idle" } | { state: "running" } | { state: "done"; status: number; html: Snapshot; rendered: Rendered } | { state: "error"; message: string };

/** Fetches a lab page's server HTML and renders it in a frame. */
export function useLabRun() {
  const [run, setRun] = useState<LabRun>({ state: "idle" });

  async function start(slug: LabSlug, interact = false) {
    setRun({ state: "running" });
    try {
      const res = await fetch(labPath(slug), { cache: "no-store" });
      const html = snapshotHtml(await res.text());
      const rendered = await renderInFrame(labPath(slug), interact);
      setRun({ state: "done", status: res.status, html, rendered });
    } catch (error) {
      setRun({ state: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { run, start };
}
