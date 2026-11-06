"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLOSE_CODES, roomFrameSchema, type ArenaSettings, type ClientFrame, type PublicRoom } from "@/learning/arena/protocol";
import { socketUrl } from "@/lib/arena-client";

// The live room in the browser (feature 023): one socket to the room, the room
// view from its `state` frames, the opponent's typing and wrong signals, a clock
// offset so countdowns match the room's, and reconnects after a drop. The
// ticket travels as the subprotocol (`["arena", ticket]`), never in the URL.

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface ArenaRoomHandle {
  status: ConnectionStatus;
  room: PublicRoom | null;
  /** Room clock minus this device's clock (ms): a deadline is `deadline - (Date.now() + offset)` away. */
  offset: number;
  /** Players typing in the current question (the opponent's dot). */
  typing: readonly string[];
  /** The last wrong answer: who, and a counter so the same player twice still shows. */
  wrong: { userId: string; count: number } | null;
  /** A message from the room or about the connection, in Vietnamese. */
  error: string | null;
  ready: () => void;
  start: () => void;
  answer: (text: string) => void;
  choose: (choice: number) => void;
  /** Tells the opponent you're typing; sent once per question. */
  typingStarted: () => void;
  rematch: () => void;
  /** The host picks who plays them next, after a match (feature 027). */
  pickOpponent: (userId: string) => void;
  /** The creator's new settings for the next match (AC-031). */
  changeSettings: (settings: ArenaSettings) => void;
  leave: () => void;
}

export interface UseArenaRoomOptions {
  /** A fresh ticket for this room: each reconnect needs one (they last 60 s). */
  refreshTicket: () => Promise<string>;
  /** For tests. */
  createSocket?: (url: string, protocols: string[]) => WebSocket;
}

/** Waits between reconnect tries (ms); the room keeps a seat for 30 s. */
export const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 8_000];

export const CONNECTION_MESSAGES = {
  replaced: "Phòng đang mở ở một tab khác.",
  lost: "Mất kết nối với phòng.",
  tooBig: "Câu trả lời quá dài.",
} as const;

function defaultSocket(url: string, protocols: string[]): WebSocket {
  return new WebSocket(url, protocols);
}

export function useArenaRoom(code: string, ticket: string | null, { refreshTicket, createSocket = defaultSocket }: UseArenaRoomOptions): ArenaRoomHandle {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [offset, setOffset] = useState(0);
  const [typing, setTyping] = useState<readonly string[]>([]);
  const [wrong, setWrong] = useState<ArenaRoomHandle["wrong"]>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const questionRef = useRef<string>("");
  const typingSentRef = useRef<string>("");
  // Kept in refs so the connect effect doesn't restart when the caller passes new functions.
  const refreshRef = useRef(refreshTicket);
  const createRef = useRef(createSocket);
  useEffect(() => {
    refreshRef.current = refreshTicket;
    createRef.current = createSocket;
  });

  useEffect(() => {
    if (!ticket) return;
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

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
        const parsed = roomFrameSchema.safeParse(data);
        if (!parsed.success) return;
        const frame = parsed.data;
        if (frame.type === "state") {
          setOffset(frame.serverNow - Date.now());
          setRoom(frame.room);
          // A new question clears the opponent's typing dot.
          const key = `${frame.room.round}:${frame.room.questionIndex}:${frame.room.phase === "question"}`;
          if (key !== questionRef.current) {
            questionRef.current = key;
            setTyping([]);
          }
        } else if (frame.type === "typing") {
          setTyping((current) => (current.includes(frame.userId) ? current : [...current, frame.userId]));
        } else if (frame.type === "wrong") {
          setWrong((current) => ({ userId: frame.userId, count: (current?.count ?? 0) + 1 }));
        } else {
          setError(frame.message);
        }
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
        if (attempt >= RECONNECT_DELAYS.length) {
          setStatus("closed");
          setError(CONNECTION_MESSAGES.lost);
          return;
        }
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
          if (attempt >= RECONNECT_DELAYS.length) {
            setStatus("closed");
            setError(CONNECTION_MESSAGES.lost);
            return;
          }
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

  const send = useCallback((frame: ClientFrame) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(frame));
  }, []);

  const currentQuestion = room?.phase === "question" ? room.questionIndex : null;

  const ready = useCallback(() => send({ type: "ready" }), [send]);
  const start = useCallback(() => send({ type: "start" }), [send]);
  const rematch = useCallback(() => send({ type: "rematch" }), [send]);
  const pickOpponent = useCallback((userId: string) => send({ type: "pick", userId }), [send]);
  const changeSettings = useCallback((settings: ArenaSettings) => send({ type: "settings", settings }), [send]);
  const leave = useCallback(() => send({ type: "leave" }), [send]);
  const answer = useCallback((text: string) => {
    if (currentQuestion !== null && text.trim()) send({ type: "answer", q: currentQuestion, text: text.trim() });
  }, [currentQuestion, send]);
  const choose = useCallback((choice: number) => {
    if (currentQuestion !== null) send({ type: "choose", q: currentQuestion, choice });
  }, [currentQuestion, send]);
  const typingStarted = useCallback(() => {
    if (currentQuestion === null || !room) return;
    const key = `${room.round}:${currentQuestion}`;
    if (typingSentRef.current === key) return;
    typingSentRef.current = key;
    send({ type: "typing", q: currentQuestion });
  }, [currentQuestion, room, send]);

  return { status, room, offset, typing, wrong, error, ready, start, answer, choose, typingStarted, rematch, pickOpponent, changeSettings, leave };
}
