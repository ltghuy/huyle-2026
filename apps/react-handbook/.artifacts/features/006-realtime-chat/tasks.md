---
id: "006"
feature: realtime-chat
created: 2026-10-07
---

# Tasks: Real-Time Chat UI

## Summary

Total: 17 | Completed: 17 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --┐
                                  ├--> T006 --┐
T005 (SSE parser) ----------------┼-----------┴--> T007 --> T008 --┬--> T009 --------┐
                                  │                                 └--> T010 --> T011 --┴--> T012 --> T013 --> T014 --> T015
```

- Backend (T001–T004) and the SSE parser (T005) are independent: T005 can run in parallel with the whole backend group.
- T009 (store extras) and T010–T011 (core UI) both start after T008 and can run in parallel; they meet at T012.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)
- No test runner in the repo: each task's "Done when" is checked with a scratch script (`curl`, a Node stream reader) or headless Chrome against `pnpm build && pnpm start` on a spare port

## Tasks

### Mock chat backend

- [x] T001 [P] Create chat schemas: network query, history query, send body (trimmed text 1–2000, name 1–32, ids ≤ 64), typing, seen, control, stream query; export `ChatMessage`, `HistoryPage`, stream event types
  - **Done when:** typecheck passes and the schemas reject an empty/2001-char text, a 33-char name and an unknown control action. -- VERIFIED

- [x] T002 [B:T001] Implement the room store on `globalThis`: seeded history spread over 3 days, `append` with increasing `seq`, idempotency by `clientId`, 500-message window (`trimmed` flag), history page `before`, subscribers with broadcast, replay-or-reset for `after`, drop subscribers by tab, bounded typing map
  - **Done when:** a scratch run shows the same `clientId` appended twice yields one message, `seq` only grows, a page before X returns ascending messages with correct `hasMore`, and `after` older than the window yields a reset. -- VERIFIED

- [x] T003 [B:T002] Implement simulated participants: activity off/normal/burst (50 messages in ~3 s), typing before posting, replies to user messages with typing, seen reports 1–3 s after user messages; start with the first subscriber, stop with the last
  - **Done when:** with one stream open, normal activity posts every few seconds with a typing event first; burst sends 50; closing the last stream stops all timers (no posts for 30 s). -- VERIFIED

- [x] T004 [B:T003] Add route handlers: `GET/POST /messages` (latency + failure, half of failures after storing), `GET /stream` (SSE headers, hello, replay/reset then live, 15 s pings, unsubscribe on abort), `POST /typing`, `POST /seen`, `POST /control` (drop, activity)
  - **Done when:** `curl` shows history paging, 201 then 200 for a repeated `clientId`, 422 for bad bodies, 500 at failRate 1 (and a lost-response 500 whose message still appears in history); a Node reader sees hello → replayed messages after `after` → live messages and pings; drop closes the stream; aborting the reader removes the subscriber. -- VERIFIED

### Client chat engine

- [x] T005 [P] Implement the SSE parser: bytes → `{ event, id, data }` events, handling chunks split mid-line, multi-line `data`, comments, CRLF
  - **Done when:** a scratch Node run feeds the same stream in 1-byte, random and whole chunks and gets identical events, with comments ignored. -- VERIFIED

- [x] T006 [B:T004] Add the client API module (history, send, typing, seen, control; module-level `network` settings) and identity (tab id in `sessionStorage`, display name in `localStorage` with random default and 1–32 validation)
  - **Done when:** typecheck passes; in the browser two tabs get different tab ids, a reloaded tab still recognizes its earlier messages as its own and keeps its name, and an invalid name is rejected. -- VERIFIED

- [x] T007 [B:T005,T006] Implement the connection: `fetch` stream + parser, statuses connecting/live/reconnecting/offline, backoff `min(500·2ⁿ, 15000) × random(0.5–1)` reset after 10 s live, `online`/`offline` + simulated offline flag, 35 s stall timeout, resume `after=lastSeq`, close on demand
  - **Done when:** in the browser, Drop connection → reconnecting → live with growing delays across repeated drops; offline stops retries and online reconnects at once; a stalled stream (pings suppressed in a scratch run) reconnects. -- VERIFIED

- [x] T008 [B:T007] Implement the chat store core: subscribe/unsubscribe opens/closes the connection, initial history then stream, merge by `seq` and `clientId` (dedupe), optimistic send with 15 s timeout, Retry (same `clientId`), Discard (late confirmation re-adds), pending persistence + restore with `ownClientIds`, delivered state, `useChat()` via `useSyncExternalStore`
  - **Done when:** a minimal debug list shows history + live messages with no duplicates across a reconnect; a sent message goes sending → sent in place whether the echo or the response comes first; a failed send keeps its text and Retry after a lost response produces one message; reloading with a pending/failed message restores it. -- VERIFIED

- [x] T009 [B:T008] Add store extras: older-page loading (one at a time, error state, beginning/trimmed marker), typing map with 5 s expiry and send/leave removal, outgoing typing throttle (3 s, false on send/blur/empty), seen watermark from other participants, outgoing seen throttle (1 s, visible tab only)
  - **Done when:** in a debug view, older pages prepend without duplicates and stop at the beginning; another tab's typing appears and expires 5 s after it stops; own messages turn seen after a bot or another visible tab sees them. -- VERIFIED

### Chat UI and practice page

- [x] T010 [B:T008] Add the shadcn `textarea`; build message row (grouped header, plain text with wrapping, time, sending/failed/delivered/seen with icon + label, Retry/Discard), composer (Enter / Shift+Enter, counter, whitespace and 2000 limits, clears on send), status badge (`role="status"`), typing line, name field
  - **Done when:** the components render all message states in light and dark with readable contrast, the composer blocks whitespace-only and 2001-char messages, and markup in a message shows as text. -- VERIFIED

- [x] T011 [B:T010] Build the message list: own scroll box, day separators, author grouping (same author within 5 min), stick-to-bottom (≤ 48 px) on new messages and on resize, always scroll on own send, no movement for others' messages when scrolled up
  - **Done when:** at the bottom, incoming and confirmed messages stay fully visible; scrolled up, others' messages don't move the view; sending from anywhere scrolls to the bottom. -- VERIFIED

- [x] T012 [B:T009,T011] Add history upward and unread: top sentinel loading with spinner / inline Retry / beginning or "may be missing" marker, manual anchoring with `overflow-anchor: none`, "N new messages" button (smooth jump unless reduced motion), unread divider kept until send or reload, tab-title count while hidden, batched announcements (1 s), toasts for long reconnects
  - **Done when:** scrolling to the top loads older pages without moving the read message; scrolled up during activity shows the count, the button jumps to the first unread, and returning to the bottom clears it; a hidden tab's title shows the count and restores on return. -- VERIFIED

- [x] T013 [B:T012] Add the demo (controls: latency, send failure, activity, Drop connection, Go offline, Open another tab; stage with chat card and "Who's here" + event counter column), explanation panel, practice route, and `built: true` in the catalog
  - **Done when:** `/practices/realtime-chat` renders through its own route, shows Built (5 of 14), every control works from the UI, and the layout has no horizontal scroll at 360 px. -- VERIFIED

### Verification

- [x] T014 [B:T013] Verify all ACs and edge cases in a production build
  - **Done when:** each AC has observed evidence recorded in this file's notes and is marked `[x]` in spec.md. -- VERIFIED

- [x] T015 [B:T014] Measure the success criteria: two-tab identical sequence over 2 min, 10 forced disconnects (3–10 s) with zero missing/duplicate, one-frame optimistic send at every latency, ≤ 1 px anchoring over 5 older pages, 50-message burst scrolled up (0 px, no long task > 50 ms), axe-core in light and dark
  - **Done when:** measurements are recorded here, ready for audit. -- VERIFIED

### Clear conversation history (change request)

- [x] T016 [B:T015] Add clear to the room (keep `nextSeq`, remember the last clear, broadcast `cleared`, replay it to clients that missed it), the `clear` control action, the client `cleared` handling with toasts and top marker, and a "Clear conversation" demo button
  - **Done when:** typecheck/lint/build pass; a stream reader sees `cleared` live and, connecting with an old `after`, sees `cleared` before newer messages. -- VERIFIED

- [x] T017 [B:T016] Verify AC-044–AC-047 and the clear edge case in a production build with two tabs
  - **Done when:** evidence recorded below and ACs marked `[x]` in spec.md. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T004, T008 |
| AC-002 | T002, T004, T005, T007 |
| AC-003 | T001, T010 |
| AC-004 | T008 |
| AC-005, AC-006 | T011 |
| AC-007 | T008, T010 |
| AC-008 | T008 |
| AC-009 | T008, T010 |
| AC-010 | T002, T004, T008 |
| AC-011 | T008 |
| AC-012 | T010 |
| AC-013–AC-016 | T011 |
| AC-017 | T007, T010 |
| AC-018–AC-020 | T007 |
| AC-021 | T008 |
| AC-022–AC-026 | T009, T012 |
| AC-027–AC-030 | T012 |
| AC-031 | T003, T004, T008, T009 |
| AC-032–AC-034 | T003, T009, T010 |
| AC-035–AC-037 | T006, T010 |
| AC-038 | T004, T013 |
| AC-039 | T004, T007, T013 |
| AC-040 | T003, T013 |
| AC-041 | T007, T013 |
| AC-042 | T003 |
| AC-043 | T002, T004, T008 |
| AC-044–AC-047 | T016, T017 |
| Edge cases | T002, T008, T010, T011, T012, T014 |
| Success criteria | T015 |

## Verification Notes (production build, `pnpm start -p 3456`)

| Check | Result |
|-------|--------|
| Schemas | 422 for `{}`, 33-char name ("Name must be at most 32 characters"), unknown control action |
| History | latest page = 30 ascending (seq 91–120), `hasMore` true; `before=20` → seq 1–19, `hasMore` false |
| Idempotent send | same `clientId` → 201 then 200 with the same message; text trimmed |
| Simulated failures | failRate 1: 6/6 → 500; 2 of them stored (lost responses), visible in history |
| Latency | `latencyMs=800` → 0.81 s |
| Stream | `hello` then replay of `seq > after`, then live; bot typing true → false → message; `: ping` at 15 s; `drop` closes it from the server |
| Bots stop | with no streams open, newest seq unchanged over 15 s |
| Burst | 50 messages in ~2.9 s, then activity back to `normal` |
| Window | after 400 more posts: oldest kept seq 76; `after=5` → `reset` with the latest page; page at the window start → `trimmed: true` |

### Client and UI (production build, headless Chrome, 1280×900 and 360×800)

| Check | Result |
|-------|--------|
| SSE parser (scratch Node run) | whole, 1-byte and random chunks give identical events; comments ignored; CRLF and multi-line data handled |
| Initial load | latest 30 messages, then Live; view pinned at the bottom (distance 0) |
| Optimistic send | visible in the next frame (18 ms) with "Sending…", input cleared; at 1500 ms latency it turned "Delivered" in place (same key), 1 copy; "Seen" ~2 s later (bot) |
| Failures (100%) | 6 sends: 3 lost responses confirmed by the stream echo, 3 shown as "Not sent … Retry / Discard"; Retry → delivered once; Discard removes it |
| Pending across reload | failed message restored with Retry; a message still sending at 5000 ms when the page reloaded was re-sent and appears once |
| Drop + catch-up | 3 messages posted while dropped → replayed 3, order strictly increasing, no duplicate seq |
| Older history | 5 loads (30, 30, 30, 20, 0): anchored message moved 0 px each time; "Beginning of conversation" at the start |
| Burst scrolled up | 50 messages: view moved 0 px, 0 long tasks; pill "53 new messages"; status region "8 new messages" (batched) |
| Unread | divider "New" above the first unread; jump puts it at the top of the box (1 px); pill gone at the bottom; divider gone after sending |
| Typing | one name, two names, "Several people are typing…"; removed on stop and on send; expired after 5 s; outgoing posts while typing 7 s: true, true, true, then false on send |
| Seen | delivered → seen when another tab reported `seen` up to its seq |
| Hidden tab | title "(3) Real-Time Chat UI · React Practices" while hidden, restored when visible |
| Offline | "Go offline" → Offline badge; send fails immediately "You're offline"; back → Live; browser `offline`/`online` events: Offline, Live 11 ms after `online` |
| Backoff | 5 drops in a row: back to Live after 305, 581, 1614, 3102, 5766 ms |
| Long outage | offline 11 s → "Connection lost" warning toast; back → "Reconnected" toast |
| Reset | 520 messages posted while offline → 1 reset, latest page shown, "Earlier messages may be missing" marker |
| Leave and return | messages rendered on first paint from memory; 4 messages posted meanwhile replayed, no duplicates |
| Name | empty → "Name can't be empty"; 33 chars → "Name must be at most 32 characters"; new name used for later messages only (server: earlier message keeps the old name) |
| Composer | whitespace-only and 2001 chars disable Send; counter "1 character over the 2000 limit"; Shift+Enter not intercepted; markup shown as text; 300-char word wraps, no horizontal overflow |
| 360 px | page `scrollWidth` 360, no element beyond the viewport |
| Typed order | bug found: parallel sends at mixed latencies were confirmed in arrival order. Fixed with a serial outbox; 15 sends over 5 latencies (3 runs) confirmed in typed order, client = server |
| Regression after outbox | 8 sends at 100% failure (5 failed, 3 lost-response confirmed) → all retried → each shown once, server has 8, storage empty |

Verified by code inspection only: 35 s stall timeout (aborts the stream and reconnects through the same path as a drop); 15 s send timeout ("Timed out"); out-of-order stream messages are placed by binary search on seq; a late confirmation for a discarded in-flight message re-adds it (in practice only failed messages can be discarded, and their echo already confirms them).

### Success criteria measurements (T015)

| Criterion | Result |
|-----------|--------|
| Two tabs, 2 min, bots on, one drop per tab | 82 overlapping messages: identical seq sequences; unique and sorted; each tab shows only its own messages as "You" (10 / 7) |
| 10 disconnects of 3–10 s while posting | 10/10 runs: 0 missing, 0 duplicates (gaps 4.7–10.0 s, 130 messages posted, 108 replayed) |
| Optimistic send within one frame | 5/5 latencies (0, 300, 1500, 5000, random) visible on the next animation frame; 15/15 in the order run |
| ≤ 1 px anchoring over 5 older pages | 0 px on every load |
| 50-message burst scrolled up | 0 px movement, 0 long tasks > 50 ms |
| axe-core 4.10.2, light + dark | 0 serious, 0 critical; 1 moderate `region` (pre-existing from 001), with a failed message and the new-messages pill on screen |

Known limitation: both tabs of the same browser restore the same unsent messages from `localStorage` (by design: "kept per browser"); whichever retries first wins, and the other confirms it from the stream echo.

### Clear conversation history (T016–T017)

| Check | Result |
|-------|--------|
| API | `clear` → `{ cleared: 120 }`; a live stream got `cleared {byName, upToSeq: 120}` then the next message as seq 121 (seq not reused); a client connecting with `after=50` got `cleared` before seq 121; history after clear: 1 message, `hasMore` false, `trimmed` false; empty `authorName` → 422 |
| Two tabs (AC-044, AC-045) | A pressed Clear: both lists emptied at once, both show "Conversation cleared by {A's name}"; A toast "Conversation cleared", B toast "{A's name} cleared the conversation" |
| Pending kept (AC-047) | A's 2 failed messages stayed after the clear; a third one whose response was lost (already stored) was removed with the history |
| Missed clear (AC-046) | B offline; A sent, cleared, sent again; B back online → only the post-clear message, B's notification count went to "2 times" (live clear + missed clear) |
| Edge: clear twice while an older page loads (5000 ms) | marker showed "Loading earlier messages…"; after both clears and the late response: 0 messages, "Conversation cleared by …", one toast per clear (merged "×2") |
| axe-core, light + dark | 0 serious, 0 critical; 1 moderate `region` (pre-existing) |

Test-harness note: a page opened with `window.open` becomes the foreground tab in headless Chrome; the opener is then `hidden`, so `requestAnimationFrame` and `IntersectionObserver` stop firing there (older pages "never load"). Run layout-dependent checks in a single-tab browser.
