"use client";

import { useCallback, useRef, useState } from "react";
import { roomFrameSchema, type ArenaSettings, type ClientFrame, type PublicRoom } from "@/learning/arena/protocol";
import { useRoomSocket, type ConnectionStatus, type RoomSocketOptions } from "./use-room-socket";

// The live duel room in the browser (feature 023): the room view from its
// `state` frames, the opponent's typing and wrong signals, and a clock offset
// so countdowns match the room's. The socket and its reconnects are
// `useRoomSocket`, shared with team rooms (feature 039).

export { CONNECTION_MESSAGES, RECONNECT_DELAYS, type ConnectionStatus } from "./use-room-socket";

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

export type UseArenaRoomOptions = RoomSocketOptions;

export function useArenaRoom(code: string, ticket: string | null, options: UseArenaRoomOptions): ArenaRoomHandle {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [offset, setOffset] = useState(0);
  const [typing, setTyping] = useState<readonly string[]>([]);
  const [wrong, setWrong] = useState<ArenaRoomHandle["wrong"]>(null);
  const questionRef = useRef<string>("");
  const typingSentRef = useRef<string>("");

  const { status, error, send: sendFrame } = useRoomSocket(
    code,
    ticket,
    (data, setError) => {
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
    },
    options,
  );
  const send = useCallback((frame: ClientFrame) => sendFrame(frame), [sendFrame]);

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
