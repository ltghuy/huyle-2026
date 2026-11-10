"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLOSE_CODES } from "@/learning/arena/protocol";
import { socketUrl } from "@/lib/arena-client";

// One socket to an Arena room, duel or team (features 023 and 039): the ticket
// travels as the subprotocol (`["arena", ticket]`), never in the URL; after a
// drop it fetches a fresh ticket and reconnects, up to RECONNECT_DELAYS tries.
// Each JSON frame goes to `onFrame`, with a way to show a room's error message;
// the room hooks read it with their schemas.

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

/** Waits between reconnect tries (ms); the room keeps a seat for 30 s. */
export const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 8_000];

export const CONNECTION_MESSAGES = {
  replaced: "Phòng đang mở ở một tab khác.",
  lost: "Mất kết nối với phòng.",
  tooBig: "Câu trả lời quá dài.",
} as const;

export interface RoomSocketOptions {
  /** A fresh ticket for this room: each reconnect needs one (they last 60 s). */
  refreshTicket: () => Promise<string>;
  /** For tests. */
  createSocket?: (url: string, protocols: string[]) => WebSocket;
}

export interface RoomSocket {
  status: ConnectionStatus;
  /** A message about the connection, in Vietnamese. */
  error: string | null;
  setError: (message: string | null) => void;
  /** Sends a frame when the socket is open; drops it otherwise. */
  send: (frame: object) => void;
}

function defaultSocket(url: string, protocols: string[]): WebSocket {
  return new WebSocket(url, protocols);
}

export function useRoomSocket(code: string, ticket: string | null, onFrame: (data: unknown, setError: (message: string) => void) => void, { refreshTicket, createSocket = defaultSocket }: RoomSocketOptions): RoomSocket {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  // Kept in refs so the connect effect doesn't restart when the caller passes new functions.
  const refreshRef = useRef(refreshTicket);
  const createRef = useRef(createSocket);
  const frameRef = useRef(onFrame);
  useEffect(() => {
    refreshRef.current = refreshTicket;
    createRef.current = createSocket;
    frameRef.current = onFrame;
  });

  useEffect(() => {
    if (!ticket) return;
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const giveUp = () => {
      setStatus("closed");
      setError(CONNECTION_MESSAGES.lost);
    };

    const open = (withTicket: string) => {
      const socket = createRef.current(socketUrl(code), ["arena", withTicket]);
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
        setError(null);
      };
      socket.onmessage = (event: MessageEvent) => {
        let data: unknown;
        try {
          data = JSON.parse(String(event.data));
        } catch {
          return;
        }
        frameRef.current(data, setError);
      };
      socket.onclose = (event: CloseEvent) => {
        if (socketRef.current === socket) socketRef.current = null;
        if (stopped) return;
        // Final closes: the room ended it, another tab took over, or a frame was too big.
        if (event.code === CLOSE_CODES.roomClosed || event.code === CLOSE_CODES.replaced || event.code === CLOSE_CODES.tooBig) {
          setStatus("closed");
          if (event.code === CLOSE_CODES.replaced) setError(CONNECTION_MESSAGES.replaced);
          if (event.code === CLOSE_CODES.tooBig) setError(CONNECTION_MESSAGES.tooBig);
          return;
        }
        if (attempt >= RECONNECT_DELAYS.length) return giveUp();
        setStatus("reconnecting");
        timer = setTimeout(reconnect, RECONNECT_DELAYS[attempt++]);
      };
    };

    const reconnect = () => {
      refreshRef.current().then(
        (fresh) => {
          if (!stopped) open(fresh);
        },
        () => {
          if (stopped) return;
          if (attempt >= RECONNECT_DELAYS.length) return giveUp();
          timer = setTimeout(reconnect, RECONNECT_DELAYS[attempt++]);
        },
      );
    };

    open(ticket);
    return () => {
      stopped = true;
      clearTimeout(timer);
      socketRef.current?.close(1000, "left");
      socketRef.current = null;
    };
  }, [code, ticket]);

  const send = useCallback((frame: object) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(frame));
  }, []);

  return { status, error, setError, send };
}
