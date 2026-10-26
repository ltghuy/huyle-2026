// Runs the demo's image work off the main thread. Pixel buffers arrive and
// leave as transferables: ownership moves between threads, nothing is copied.
import { blurAll, makePhoto } from "./blur";

type Request = { type: "make" } | { type: "blur"; buffer: ArrayBuffer };

self.onmessage = (event: MessageEvent<Request>) => {
  const pixels = event.data.type === "make" ? makePhoto() : blurAll(new Uint8ClampedArray(event.data.buffer));
  self.postMessage({ buffer: pixels.buffer }, { transfer: [pixels.buffer] });
};
