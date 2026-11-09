import { parseLinkFrame, type LinkClientFrame, type LinkFrame } from "@/learning/arena/link";
import { fetchLinkTicket, linkSocketUrl } from "@/lib/arena-client";

// The tab's link to the learner's own Durable Object (feature 035): one socket per
// tab, opened by `LinkRunner` while signed in. It reconnects on its own, and tells
// the link again which room page this tab has open after every reconnect.

/** Waits between reconnect tries (ms); the last one repeats. */
export const LINK_RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

type Listener = (frame: LinkFrame) => void;

export interface LinkOptions {
  getTicket: () => Promise<string>;
  url: () => string;
  createSocket?: (url: string, protocols: string[]) => WebSocket;
}

export interface Link {
  start(): void;
  stop(): void;
  /** The room page this tab has open, or null; kept and re-sent after a reconnect. */
  setRoom(code: string | null): void;
  /** The learner's answer to a challenge; false when the socket isn't open. */
  answer(hostId: string, code: string, accept: boolean): boolean;
  subscribe(listener: Listener): () => void;
}

function defaultSocket(url: string, protocols: string[]): WebSocket {
  return new WebSocket(url, protocols);
}

export function createLink({ getTicket, url, createSocket = defaultSocket }: LinkOptions): Link {
  const listeners = new Set<Listener>();
  let socket: WebSocket | null = null;
  let room: string | null = null;
  let running = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function send(frame: LinkClientFrame): boolean {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(frame));
    return true;
  }

  function retry() {
    if (!running) return;
    const delay = LINK_RECONNECT_DELAYS[Math.min(attempt, LINK_RECONNECT_DELAYS.length - 1)];
    attempt++;
    timer = setTimeout(open, delay);
  }

  function connect(ticket: string) {
    if (!running) return;
    const next = createSocket(url(), ["arena", ticket]);
    socket = next;
    next.onopen = () => {
      attempt = 0;
      if (room) send({ type: "room", code: room });
    };
    next.onmessage = (event: MessageEvent) => {
      const frame = parseLinkFrame(String(event.data));
      if (frame) for (const listener of listeners) listener(frame);
    };
    next.onclose = () => {
      if (socket !== next) return;
      socket = null;
      retry();
    };
  }

  function open() {
    getTicket().then(connect, retry);
  }

  return {
    start() {
      if (running) return;
      running = true;
      attempt = 0;
      open();
    },
    stop() {
      running = false;
      clearTimeout(timer);
      const current = socket;
      socket = null;
      current?.close(1000, "signed out");
    },
    setRoom(code) {
      room = code;
      send({ type: "room", code });
    },
    answer(hostId, code, accept) {
      return send({ type: "answer", hostId, code, accept });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

/** This tab's link. */
export const link: Link = createLink({ getTicket: () => fetchLinkTicket().then((result) => result.ticket), url: () => linkSocketUrl() });
