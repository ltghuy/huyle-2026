"use client";

import { useCallback, useRef, useState } from "react";
import { roomFrameSchema } from "@/learning/arena/protocol";
import { teamStateFrameSchema, type PublicTeamRoom, type Team, type TeamClientFrame, type TeamSettings } from "@/learning/arena/team-protocol";
import { useRoomSocket, type ConnectionStatus, type RoomSocketOptions } from "./use-room-socket";

// The live team room in the browser ("Đấu đội", feature 039): the room view
// from `team-state` frames, the turn player's typing and wrong signals, the
// clock offset, and the frames a player or the host sends.

export interface TeamRoomHandle {
  status: ConnectionStatus;
  room: PublicTeamRoom | null;
  /** Room clock minus this device's clock (ms). */
  offset: number;
  /** The turn player is typing the open question. */
  typing: boolean;
  /** The last wrong typed answer, counted so the same player twice still shows. */
  wrong: { userId: string; count: number } | null;
  /** A message from the room or about the connection, in Vietnamese. */
  error: string | null;
  assign: (userId: string, team: Team | null) => void;
  order: (team: Team, ids: string[]) => void;
  shuffle: () => void;
  start: () => void;
  answer: (text: string) => void;
  choose: (choice: number) => void;
  hint: () => void;
  /** Tells everyone the turn player is typing; sent once per question. */
  typingStarted: () => void;
  changeSettings: (settings: TeamSettings) => void;
  again: () => void;
  leave: () => void;
}

export function useTeamRoom(code: string, ticket: string | null, options: RoomSocketOptions): TeamRoomHandle {
  const [room, setRoom] = useState<PublicTeamRoom | null>(null);
  const [offset, setOffset] = useState(0);
  const [typing, setTyping] = useState(false);
  const [wrong, setWrong] = useState<TeamRoomHandle["wrong"]>(null);
  const questionRef = useRef("");
  const typingSentRef = useRef("");

  const { status, error, send: sendFrame } = useRoomSocket(
    code,
    ticket,
    (data, setError) => {
      const state = teamStateFrameSchema.safeParse(data);
      if (state.success) {
        setOffset(state.data.serverNow - Date.now());
        setRoom(state.data.room);
        // A new turn clears the typing dot.
        const key = `${state.data.room.round}:${state.data.room.number}:${state.data.room.turn?.userId ?? ""}:${state.data.room.phase === "question"}`;
        if (key !== questionRef.current) {
          questionRef.current = key;
          setTyping(false);
        }
        return;
      }
      const parsed = roomFrameSchema.safeParse(data);
      if (!parsed.success) return;
      const frame = parsed.data;
      if (frame.type === "typing") setTyping(true);
      else if (frame.type === "wrong") setWrong((current) => ({ userId: frame.userId, count: (current?.count ?? 0) + 1 }));
      else if (frame.type === "error") setError(frame.message);
    },
    options,
  );
  const send = useCallback((frame: TeamClientFrame) => sendFrame(frame), [sendFrame]);

  const open = room?.phase === "question" ? room.number : null;

  const assign = useCallback((userId: string, team: Team | null) => send({ type: "assign", userId, team }), [send]);
  const order = useCallback((team: Team, ids: string[]) => send({ type: "order", team, ids }), [send]);
  const shuffle = useCallback(() => send({ type: "shuffle" }), [send]);
  const start = useCallback(() => send({ type: "start" }), [send]);
  const changeSettings = useCallback((settings: TeamSettings) => send({ type: "settings", settings }), [send]);
  const again = useCallback(() => send({ type: "again" }), [send]);
  const leave = useCallback(() => send({ type: "leave" }), [send]);
  const answer = useCallback((text: string) => {
    if (open !== null && text.trim()) send({ type: "answer", q: open, text: text.trim() });
  }, [open, send]);
  const choose = useCallback((choice: number) => {
    if (open !== null) send({ type: "choose", q: open, choice });
  }, [open, send]);
  const hint = useCallback(() => {
    if (open !== null) send({ type: "hint", q: open });
  }, [open, send]);
  const typingStarted = useCallback(() => {
    if (open === null || !room) return;
    const key = `${room.round}:${open}`;
    if (typingSentRef.current === key) return;
    typingSentRef.current = key;
    send({ type: "typing", q: open });
  }, [open, room, send]);

  return { status, room, offset, typing, wrong, error, assign, order, shuffle, start, answer, choose, hint, typingStarted, changeSettings, again, leave };
}
