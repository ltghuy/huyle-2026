"use client";

import { ArrowDown, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { chat, type ChatSnapshot, type LocalMessage } from "./chat-store";
import { MessageRow } from "./message-row";

/** Within this distance of the bottom counts as "at the bottom". */
const PIN_THRESHOLD = 48;
/** Same author within this time shares one header. */
const GROUP_MS = 5 * 60_000;
const ANNOUNCE_EVERY_MS = 1000;
const DAY = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });

type Anchor = { key: string; offset: number };

type Item =
  | { kind: "day"; key: string; label: string }
  | { kind: "divider"; key: string }
  | { kind: "message"; key: string; message: LocalMessage; showHeader: boolean };

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return DAY.format(new Date(iso));
}

type DividerStart = { seq: number; sends: number };

/** First other-participant message after the divider start, until the user sends. */
function findDividerKey(messages: LocalMessage[], start: DividerStart | null, sends: number) {
  if (start === null || sends !== start.sends) return null;
  const first = messages.find((m) => !m.own && m.seq !== null && m.seq > start.seq);
  return first?.clientId ?? null;
}

function buildItems(messages: LocalMessage[], dividerKey: string | null): Item[] {
  const items: Item[] = [];
  let prev: LocalMessage | null = null;
  for (const message of messages) {
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
    if (newDay) items.push({ kind: "day", key: `day-${dayKey(message.createdAt)}`, label: dayLabel(message.createdAt) });
    const divider = message.clientId === dividerKey;
    if (divider) items.push({ kind: "divider", key: "divider" });
    const sameGroup =
      prev !== null &&
      !newDay &&
      !divider &&
      prev.authorId === message.authorId &&
      Date.parse(message.createdAt) - Date.parse(prev.createdAt) < GROUP_MS;
    items.push({ kind: "message", key: message.clientId, message, showHeader: !sameGroup });
    prev = message;
  }
  return items;
}

function distanceFromBottom(box: HTMLElement) {
  return box.scrollHeight - box.scrollTop - box.clientHeight;
}

/** The first message row whose bottom is below the top edge (rows are direct children). */
function firstVisible(box: HTMLElement, list: HTMLElement): Anchor | null {
  const rows = list.children;
  let lo = 0;
  let hi = rows.length - 1;
  let index = rows.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const row = rows[mid] as HTMLElement;
    if (row.offsetTop + row.offsetHeight > box.scrollTop) {
      index = mid;
      hi = mid - 1;
    } else lo = mid + 1;
  }
  // Skip the top marker, day separators and the divider: anchor on a message.
  for (let i = index; i < rows.length; i++) {
    const row = rows[i] as HTMLElement;
    if (row.dataset.key) return { key: row.dataset.key, offset: row.offsetTop - box.scrollTop };
  }
  return null;
}

/** The newest confirmed message whose top is above the bottom edge. */
function lastVisibleSeq(box: HTMLElement, list: HTMLElement) {
  const bottom = box.scrollTop + box.clientHeight;
  for (let i = list.children.length - 1; i >= 0; i--) {
    const row = list.children[i] as HTMLElement;
    if (row.offsetTop >= bottom || !row.dataset.seq) continue;
    return Number(row.dataset.seq);
  }
  return 0;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}


export function MessageList({
  snapshot,
  scrollRequest,
}: {
  snapshot: ChatSnapshot;
  /** Bumped by the composer after each send: go to the bottom, clear the divider. */
  scrollRequest: number;
}) {
  const { messages, older, gapAbove, seenUpTo } = snapshot;
  const boxRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const topRef = useRef<HTMLLIElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const pinnedRef = useRef(true);
  const anchorRef = useRef<Anchor | null>(null);
  const firstKeyRef = useRef<string | null>(null);
  const announcedSeqRef = useRef<number | null>(null);
  const announceQueue = useRef<LocalMessage[]>([]);

  const [pinned, setPinned] = useState(true);
  /** Others' messages up to this seq count as read. Null: everything so far. */
  const [readUpTo, setReadUpTo] = useState<number | null>(null);
  /** The unread divider sits after this seq, until the user sends again. */
  const [dividerFrom, setDividerFrom] = useState<DividerStart | null>(null);
  const [visible, setVisible] = useState(true);

  const lastSeq = lastConfirmedSeq(messages);
  const dividerKey = findDividerKey(messages, dividerFrom, scrollRequest);
  const items = buildItems(messages, dividerKey);
  const unread = pinned && visible ? [] : unreadMessages(messages, readUpTo ?? lastSeq);

  function scrollToBottom() {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }

  /** Called whenever the reader is at the bottom of a visible tab. */
  function markAllRead() {
    setReadUpTo(lastSeq);
    if (lastSeq) chat.reportSeen(lastSeq);
  }

  function startUnreadIfNeeded() {
    // Leaving the bottom (or the tab) starts a new unread run, unless a divider is still shown.
    if (dividerKey === null) setDividerFrom({ seq: lastSeq, sends: scrollRequest });
    setReadUpTo((value) => value ?? lastSeq);
  }

  function handleScroll() {
    const box = boxRef.current;
    const list = listRef.current;
    if (!box || !list) return;
    const atBottom = distanceFromBottom(box) <= PIN_THRESHOLD;
    pinnedRef.current = atBottom;
    anchorRef.current = firstVisible(box, list);
    if (atBottom !== pinned) setPinned(atBottom);
    if (!visible) return;
    if (atBottom) markAllRead();
    else {
      if (pinned) startUnreadIfNeeded();
      chat.reportSeen(lastVisibleSeq(box, list));
    }
  }

  function handleJump() {
    const first = unread[0];
    const row = first && listRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(first.clientId)}"]`);
    if (!row) return scrollToBottom();
    row.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const handleVisibility = useEffectEvent(() => {
    const isVisible = document.visibilityState === "visible";
    setVisible(isVisible);
    if (!isVisible) startUnreadIfNeeded();
    else if (pinnedRef.current) markAllRead();
  });

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // After every commit, before paint: keep the reader's place.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const list = listRef.current;
    if (!box || !list) return;
    const firstKey = messages[0]?.clientId ?? null;
    const prepended = firstKeyRef.current !== null && firstKey !== firstKeyRef.current;
    firstKeyRef.current = firstKey;

    const anchor = anchorRef.current;
    const anchorRow = prepended && anchor
      ? list.querySelector<HTMLElement>(`[data-key="${CSS.escape(anchor.key)}"]`)
      : null;
    if (pinnedRef.current) scrollToBottom();
    else if (anchorRow && anchor) box.scrollTop = anchorRow.offsetTop - anchor.offset;
    anchorRef.current = firstVisible(box, list);
  }, [messages]);

  // Own send: always jump to the bottom.
  useLayoutEffect(() => {
    if (scrollRequest === 0) return;
    pinnedRef.current = true;
    scrollToBottom();
  }, [scrollRequest]);

  // Content that changes size (confirmations, wrapping, failed markers) keeps a pinned view pinned.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToBottom();
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // Load older messages when the top marker comes into view. Re-observing after
  // each load fires again if the marker is still visible.
  useEffect(() => {
    const box = boxRef.current;
    const top = topRef.current;
    if (!box || !top || snapshot.initial !== "ready" || older.status !== "idle") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void chat.loadOlder();
      },
      { root: box, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(top);
    return () => observer.disconnect();
  }, [snapshot.initial, older.status, messages.length]);

  // Seen + read bookkeeping when new messages land at the bottom of a visible tab.
  useEffect(() => {
    if (!visible || !pinnedRef.current || !lastSeq) return;
    chat.reportSeen(lastSeq);
  }, [visible, lastSeq]);

  // Tab title shows the unread count while hidden.
  useEffect(() => {
    if (visible || unread.length === 0) return;
    const original = document.title;
    document.title = `(${unread.length}) ${original.replace(/^\(\d+\) /, "")}`;
    return () => {
      document.title = original;
    };
  }, [visible, unread.length]);

  // Announce others' new messages, batched once a second so bursts don't flood.
  useEffect(() => {
    const from = announcedSeqRef.current;
    announcedSeqRef.current = lastSeq;
    if (from === null || snapshot.initial !== "ready") return;
    for (const m of messages) {
      if (!m.own && m.seq !== null && m.seq > from) announceQueue.current.push(m);
    }
  }, [lastSeq, messages, snapshot.initial]);

  useEffect(() => {
    const timer = setInterval(() => {
      const queue = announceQueue.current;
      if (queue.length === 0 || !liveRef.current) return;
      announceQueue.current = [];
      liveRef.current.textContent =
        queue.length === 1 ? `${queue[0].authorName}: ${queue[0].text}` : `${queue.length} new messages`;
    }, ANNOUNCE_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      {/* Focusable so keyboard users can scroll it. */}
      <section
        ref={boxRef}
        onScroll={handleScroll}
        tabIndex={0}
        aria-label="Messages"
        className="relative h-[min(65vh,36rem)] overflow-y-auto overscroll-contain rounded-lg border bg-background px-3 py-2 [overflow-anchor:none] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ol ref={listRef} className="flex flex-col pb-1">
          <li ref={topRef} className="py-2 text-center text-xs text-foreground/75">
            <TopMarker snapshot={snapshot} gapAbove={gapAbove} />
          </li>
          {items.map((item) => (
            <li
              key={item.key}
              data-key={item.kind === "message" ? item.key : undefined}
              data-seq={item.kind === "message" && item.message.seq !== null ? item.message.seq : undefined}
            >
              <ItemView item={item} seenUpTo={seenUpTo} />
            </li>
          ))}
        </ol>
      </section>

      {unread.length > 0 ? (
        <Button
          size="sm"
          onClick={handleJump}
          className="absolute bottom-3 left-1/2 h-9 -translate-x-1/2 rounded-full shadow-md"
        >
          <ArrowDown aria-hidden />
          {unread.length === 1 ? "1 new message" : `${unread.length} new messages`}
        </Button>
      ) : null}
      <p ref={liveRef} role="status" className="sr-only" />
    </div>
  );
}

function lastConfirmedSeq(messages: LocalMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const seq = messages[i].seq;
    if (seq !== null) return seq;
  }
  return 0;
}

function unreadMessages(messages: LocalMessage[], after: number) {
  return messages.filter((m) => !m.own && m.seq !== null && m.seq > after);
}

function ItemView({ item, seenUpTo }: { item: Item; seenUpTo: number }) {
  if (item.kind === "day") {
    return (
      <div className="my-3 flex items-center gap-3 text-xs font-medium text-foreground/75">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span>{item.label}</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
    );
  }
  if (item.kind === "divider") {
    return (
      <div className="my-3 flex items-center gap-3 text-xs font-semibold text-destructive">
        <span aria-hidden className="h-px flex-1 bg-destructive/60" />
        <span>New</span>
        <span aria-hidden className="h-px flex-1 bg-destructive/60" />
      </div>
    );
  }
  const { message } = item;
  const seen = message.own && message.seq !== null && message.seq <= seenUpTo;
  return <MessageRow message={message} showHeader={item.showHeader} seen={seen} />;
}

function TopMarker({ snapshot, gapAbove }: { snapshot: ChatSnapshot; gapAbove: boolean }) {
  const { older, initial } = snapshot;
  if (initial === "loading" || older.status === "loading") {
    return (
      <span className="inline-flex items-center gap-2">
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
        {initial === "loading" ? "Loading messages…" : "Loading earlier messages…"}
      </span>
    );
  }
  if (initial === "error") {
    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-2 text-destructive">
        Couldn&apos;t load messages: {snapshot.initialError}
        <Button variant="outline" size="sm" onClick={chat.retryInitial}>
          <RotateCcw aria-hidden /> Retry
        </Button>
      </span>
    );
  }
  if (older.status === "error") {
    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-2 text-destructive">
        Couldn&apos;t load earlier messages: {older.error}
        <Button variant="outline" size="sm" onClick={() => void chat.loadOlder()}>
          <RotateCcw aria-hidden /> Retry
        </Button>
      </span>
    );
  }
  if (older.status === "done") {
    if (older.trimmed || gapAbove) return "Earlier messages may be missing";
    return snapshot.clearedBy ? `Conversation cleared by ${snapshot.clearedBy}` : "Beginning of conversation";
  }
  return gapAbove ? "Earlier messages may be missing — scroll for more" : " ";
}
