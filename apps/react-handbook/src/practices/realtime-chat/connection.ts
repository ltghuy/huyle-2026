import type { StreamEvent } from "@/server/practices/realtime-chat/chat.schema";

import { streamUrl } from "./chat-api";
import { createSseParser } from "./sse";

// The live connection: a fetch() stream read by hand, so every recovery step
// is ours: backoff with jitter, offline awareness, stall detection, and
// resuming after the last message we have.

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export type ConnectionInfo = {
  status: ConnectionStatus;
  /** Failed attempts in a row. */
  attempt: number;
  /** When the next reconnect starts (epoch ms), while waiting. */
  retryAt: number | null;
};

type Options = {
  tabId: string;
  /** Last seq the client has; the server replays everything after it. */
  getAfter: () => number;
  onEvent: (event: StreamEvent) => void;
  onInfo: (info: ConnectionInfo) => void;
};

const BASE_DELAY = 500;
const MAX_DELAY = 15_000;
/** Live this long → the next drop starts backoff from the beginning again. */
const STABLE_MS = 10_000;
/** The server pings every 15 s; this much silence means the stream is dead. */
const STALL_MS = 35_000;

export function backoff(attempt: number) {
  const ceiling = Math.min(BASE_DELAY * 2 ** (attempt - 1), MAX_DELAY);
  return ceiling * (0.5 + Math.random() * 0.5);
}

export function createConnection({ tabId, getAfter, onEvent, onInfo }: Options) {
  let running = false;
  let simulatedOffline = false;
  let info: ConnectionInfo = { status: "connecting", attempt: 0, retryAt: null };
  let abort: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const isOffline = () => simulatedOffline || !navigator.onLine;

  function setInfo(next: Partial<ConnectionInfo>) {
    info = { ...info, ...next };
    onInfo(info);
  }

  function clearTimers() {
    clearTimeout(retryTimer);
    clearTimeout(stableTimer);
    clearTimeout(stallTimer);
  }

  function closeStream() {
    clearTimers();
    abort?.abort();
    abort = null;
  }

  function armStall(controller: AbortController) {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), STALL_MS);
  }

  async function connect() {
    if (!running) return;
    if (isOffline()) return setInfo({ status: "offline", retryAt: null });

    const controller = new AbortController();
    abort = controller;
    setInfo({ status: info.attempt === 0 ? "connecting" : "reconnecting", retryAt: null });

    try {
      const res = await fetch(streamUrl(tabId, getAfter()), {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const parser = createSseParser(({ event, data }) => {
        const parsed = { type: event, data: JSON.parse(data) } as StreamEvent;
        if (parsed.type === "hello") {
          setInfo({ status: "live" });
          stableTimer = setTimeout(() => {
            if (abort === controller) info = { ...info, attempt: 0 };
          }, STABLE_MS);
        }
        onEvent(parsed);
      });

      const reader = res.body.getReader();
      armStall(controller);
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        armStall(controller);
        parser.push(value);
      }
    } catch {
      // Network error, abort, stall or bad response: all end up reconnecting.
    }

    // Stopped, or replaced by a newer connection: nothing to do.
    if (abort !== controller) return;
    abort = null;
    clearTimers();
    scheduleReconnect();
  }

  function scheduleReconnect() {
    if (!running) return;
    if (isOffline()) return setInfo({ status: "offline", retryAt: null });
    const attempt = info.attempt + 1;
    const delay = backoff(attempt);
    setInfo({ status: "reconnecting", attempt, retryAt: Date.now() + delay });
    retryTimer = setTimeout(() => void connect(), delay);
  }

  /** Back online: skip the wait and connect now. */
  function handleOnline() {
    if (!running || isOffline() || abort) return;
    clearTimers();
    info = { ...info, attempt: 0 };
    void connect();
  }

  function handleOffline() {
    if (!running) return;
    closeStream();
    setInfo({ status: "offline", retryAt: null });
  }

  return {
    start() {
      if (running) return;
      running = true;
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      info = { status: "connecting", attempt: 0, retryAt: null };
      void connect();
    },
    stop() {
      running = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      closeStream();
    },
    setSimulatedOffline(value: boolean) {
      simulatedOffline = value;
      if (value) handleOffline();
      else handleOnline();
    },
    isOffline,
    getInfo: () => info,
  };
}
