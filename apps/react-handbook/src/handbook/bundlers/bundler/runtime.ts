import type { BundleFile } from "./link";

// Runs a bundle in the page. The bundle gets a captured console and a host
// that records what the runtime does and "downloads" chunk files after a
// delay, standing in for the network.

export type RunEvent = { kind: "evaluate" | "cache" | "log" | "fetch" | "loaded" | "error"; text: string; at: number };

export type RunHandle = { exports: Record<string, unknown> | null; error: string | null };

const MAX_EVENTS = 500;

export function runBundle(files: BundleFile[], options: { latencyMs: number; onEvent: (event: RunEvent) => void }): RunHandle {
  const started = performance.now();
  let count = 0;
  const emit = (kind: RunEvent["kind"], text: string) => {
    // The budget stops runaway programs; the error that reports it always gets through.
    if (kind !== "error" && ++count > MAX_EVENTS) throw new Error(`Stopped after ${MAX_EVENTS} steps`);
    options.onEvent({ kind, text, at: Math.round(performance.now() - started) });
  };
  const format = (v: unknown) => (typeof v === "string" ? v : v instanceof Error ? `${v.name}: ${v.message}` : JSON.stringify(v) ?? String(v));
  const fakeConsole = { log: (...args: unknown[]) => emit("log", args.map(format).join(" ")) };
  const host = {
    trace: (kind: "evaluate" | "cache", id: string) => emit(kind, id),
    loadChunk: (chunk: string) => {
      const file = files.find((f) => f.chunk === chunk);
      emit("fetch", file ? file.name : `${chunk} (missing)`);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!file) return reject(new Error(`Chunk ${chunk} not found`));
          emit("loaded", `${file.name} (${new TextEncoder().encode(file.code).byteLength} B)`);
          resolve((registry: Record<string, unknown>) => {
            new Function("__register", "console", file.code)((mods: Record<string, unknown>) => Object.assign(registry, mods), fakeConsole);
          });
        }, options.latencyMs);
      });
    },
  };
  const main = files.find((f) => f.chunk === "main");
  if (!main) return { exports: null, error: "No entry chunk" };
  try {
    const exports = new Function("console", "__host", "return " + main.code)(fakeConsole, host) as Record<string, unknown>;
    return { exports, error: null };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    emit("error", message);
    return { exports: null, error: message };
  }
}

/** Calls an exported function of the entry module, reporting a thrown or rejected error as an event. */
export async function callExport(handle: RunHandle, name: string, onEvent: (event: RunEvent) => void) {
  const fn = handle.exports?.[name];
  if (typeof fn !== "function") return;
  try {
    await fn();
  } catch (error) {
    onEvent({ kind: "error", text: error instanceof Error ? `${error.name}: ${error.message}` : String(error), at: 0 });
  }
}
