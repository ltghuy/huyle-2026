// Renders a same-origin page in a hidden iframe, so its real JavaScript runs
// in the reader's browser, then reads the result like a renderer would.

import { type DocumentFields, readDocument } from "../inspect";

export type Snapshot = DocumentFields & { markers: string[]; navs: NavElement[] };

export type NavElement = { label: string; tag: string; href: string | null; rel: string | null };

const LOAD_TIMEOUT = 8000;
const SETTLE = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function snapshot(doc: Document): Snapshot {
  return {
    ...readDocument(doc),
    markers: [...doc.querySelectorAll<HTMLElement>("[data-marker]")].map((el) => el.dataset.marker!),
    navs: [...doc.querySelectorAll<HTMLElement>("[data-nav]")].map((el) => ({
      label: el.dataset.nav!,
      tag: el.tagName.toLowerCase(),
      href: el.getAttribute("href"),
      rel: el.getAttribute("rel"),
    })),
  };
}

/** Server HTML read the same way as the rendered page, for side-by-side comparison. */
export function snapshotHtml(html: string): Snapshot {
  return snapshot(new DOMParser().parseFromString(html, "text/html"));
}

export type Rendered = { before: Snapshot; after: Snapshot | null; timedOut: boolean };

/**
 * Loads `path` in an offscreen iframe, waits for it to settle, and snapshots
 * it. With `interact`, it then clicks every `[data-lab-action]`, scrolls to
 * the bottom and snapshots again.
 */
export async function renderInFrame(path: string, interact = false): Promise<Rendered> {
  const frame = document.createElement("iframe");
  frame.title = "Hidden render of a lab page";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "1024px", height: "768px", border: "0" });

  const loaded = new Promise<boolean>((resolve) => {
    frame.addEventListener("load", () => resolve(true), { once: true });
    setTimeout(() => resolve(false), LOAD_TIMEOUT);
  });
  frame.src = path;
  document.body.append(frame);

  try {
    const ok = await loaded;
    await wait(SETTLE);
    const doc = frame.contentDocument;
    if (!doc) throw new Error("The frame's document isn't readable.");
    const before = snapshot(doc);
    let after: Snapshot | null = null;
    if (interact) {
      doc.querySelectorAll<HTMLElement>("[data-lab-action]").forEach((el) => el.click());
      frame.contentWindow?.scrollTo(0, doc.documentElement.scrollHeight);
      await wait(SETTLE);
      after = snapshot(doc);
    }
    return { before, after, timedOut: !ok };
  } finally {
    frame.remove();
  }
}
