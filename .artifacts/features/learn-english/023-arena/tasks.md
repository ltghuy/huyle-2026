---
id: 023
feature: arena
created: 2026-11-04
---

# Tasks: Arena (1-on-1 duels)

Paths are relative to `apps/learn-english/`. Design: `design.md` (UI in "UI & Experience Direction").

## Summary

Total: 25 | Completed: 21 | Remaining: 4

## Execution Plan

```
T001 (spike: worker.ts + DO) --┬--> T008 --> T011 --> T012 --> T013 --┐
T002 (spike: e2e sign-in) -----│-----------------------------------------┼--> T023 --> T024 --> T025
                               │                                         │
T003 --> T004 ---------------->┤                                         │
T003 --> T005 --> T006 --> T007┘                                         │
T009 [P] ---> (T011, T013, T022)                                         │
T010 [B:T004] --> T011                                                   │
                                                                         │
T014 [P] --> T016 --> T018 --> T019 --> T020 --> T021 ------------------>┤
T003 --> T015 -----^ (hook used from T018 on)                            │
T017 [P] ---------------------------------------------------------------->┤
T022 [B:T009,T014] ------------------------------------------------------>┘
```

Critical path: T001 → T011 → T012 → T013 → T023. The pure logic (T003–T007) and the screens (T014–T021, built against a fake room hook) can run alongside the server work. T001 is a gate: if the spike fails, stop and revisit the Decisions table before T008.

## Quality Gates

Run after each task or batch (from the repo root):

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- After T012, T018 and T023 also: `pnpm --filter learn-english build` and `pnpm --filter learn-english e2e`

## Tasks

### Spikes (gate)

- [x] T001 [P] Prove a custom `worker.ts` that wraps `.open-next/worker.js`, exports a minimal `ArenaRoom` Durable Object (SQLite migration `v1`), and routes `/api/arena/socket` upgrades to it with the hibernation API (echo server); set `wrangler.jsonc` `main`, the binding and the migration; run `pnpm cf:typegen`
  - **Done when:** `pnpm cf:build` and `pnpm cf:preview` succeed; a WebSocket to `/api/arena/socket?code=TEST` on the preview echoes a message after the object has hibernated (idle > 10 s) and an alarm wakes it; every existing page still serves; `wrangler deploy --dry-run` accepts the bundle; the `@/` alias resolves inside the worker. Findings written to `.artifacts/research/learn-english-realtime-arena.md` (Uncertainties resolved or a revised plan)

- [x] T002 [P] Prove e2e sign-in: a `signInAs(context, { id, name })` helper in `e2e/helpers.ts` that inserts `user` and `session` rows into the e2e D1 and sets Better Auth's signed session cookie from the e2e `.dev.vars` secret
  - **Done when:** an e2e test signed in with the helper sees `/api/auth/get-session` return the user and the profile page unlocked; two browser contexts can be signed in as different users in one test

### Arena rules (pure, `src/learning/arena/`)

- [x] T003 [P] Define the protocol in `protocol.ts`: room settings (`mode`, `level`, `rounds`), client frames (`ready`, `start`, `answer`, `choose`, `typing`, `rematch`, `leave`), room frames (`state`, `typing`, `wrong`, `error`), `PublicRoom` and question public views; size caps
  - **Done when:** `protocol.test.ts` accepts every valid frame and rejects unknown types, bad settings, and text over the cap

- [x] T004 [B:T003] Build rounds in `questions.ts`: `buildRound(pool, settings, seed, count)` (12, or 1 for sudden death; "Hỗn hợp" spreads 4/4/4), `publicView(q)` (no answer; recall without audio), `grade(q, answer)` via `gradeListeningChoice`, `gradeRecall` (typo counts) and `gradeTranslate` with wordings, `availableModes(pool)`
  - **Done when:** `questions.test.ts` covers same seed same list, per-mode types, public views leaking nothing, grading per type (wordings, contractions, recall typo), and a level short of items disabling its mode (AC-002 availability, AC-011, AC-015, AC-019)

- [x] T005 [B:T003] Write the state machine's room and lobby part in `machine.ts`: `create`, `join`, `leave`, lobby disconnect grace, the 30 s Ready window opened on join, `ready`, expiry back to lobby, creator `start`, 3 s countdown, idle close after 10 min, creator leaving closes the room; `reduce(state, event, now) → { state, send, alarmAt }`
  - **Done when:** `machine.test.ts` covers AC-007, AC-008, AC-009, AC-010 and the idle-close and own-room edge cases, including a duplicate `tick` doing nothing

- [x] T006 [B:T005,T004] Add play to the machine: questions with per-type deadlines, private answers, `typing` once per question, `wrong` relays, lock-out after a wrong choice, typed retries, first processed correct answer scores, late answers ignored, timeout without a point, 3 s reveal, round end after 12, 5 s round result, sudden death up to 3 then the faster-total rule, match end at 1/1 or 2/3, answer flood limit
  - **Done when:** tests cover AC-012, AC-013, AC-014, AC-016, AC-017, AC-018, AC-020, AC-021, AC-022 and the near-simultaneous, late-answer and flooding edge cases

- [x] T007 [B:T006] Add the rest: in-match disconnect pause with 30 s grace, reconnect restarting the question with full time, forfeit to the player who stayed, a newer socket replacing an older one, rematch when both ask (new seed, back to Ready)
  - **Done when:** tests cover AC-024, AC-025, AC-026, AC-027 and the second-tab edge case

### Server

- [x] T008 [B:T001] Add `ARENA_SECRET` (min 32) to `src/server/env.ts` and `.dev.vars.example`, and `src/server/arena/ticket.ts` with `signTicket` / `verifyTicket` (HMAC-SHA256, 60 s, bound to a code)
  - **Done when:** `ticket.test.ts` (node env) covers round trip, expiry, tampering and a wrong code

- [x] T009 [P] Add `arena_stats` to `src/server/db/schema.ts`, generate `migrations/0006_arena.sql` and hand-write `ON DELETE CASCADE`; write `recordResult(db, winnerId, loserId, now)` and `getStats(db, userId)` in `src/server/arena/stats.ts` (no `server-only`: the room imports it)
  - **Done when:** `arena.service.test.ts` over `sqliteDb()` covers first win, win streak growth and reset on a loss, best streak, zeros for a new user, and the row going when the user is deleted (AC-029)

- [x] T010 [B:T004] Write the content loader `src/server/arena/content.ts`: one D1 query for a level's words, sentences and wordings (not deleted), parsed with `contentItemSchema` into the pool `buildRound` takes
  - **Done when:** a test over `sqliteDb()` with seeded content returns the pool and skips deleted rows

- [x] T011 [B:T001,T007,T008,T009,T010] Build the real `ArenaRoom` in `src/server/arena/room.ts`: `create()` RPC, socket accept with the ticket identity in the attachment, frames validated and fed to `reduce`, state saved under `room` after each event, one alarm from `alarmAt`, broadcasts with `serverNow`, content loaded once per round, `recordResult` at match end, nothing else written (AC-023), close codes 4001 and 1009. A `replace` effect closes the user's older sockets with 4001; their `webSocketClose` must not become a `disconnect` while a newer socket for that user is open. Before a tick, load the level's content when `needsPool(state)`
  - **Done when:** unit tests with a fake storage, fake sockets and a fake clock drive a full 1-round match through the class; on `pnpm cf:preview` a scripted two-socket run reaches match end and writes one `arena_stats` row per player

- [x] T012 [B:T011] Route sockets in `worker.ts`: verify the ticket, 401 when missing or expired, forward to `ARENA_ROOM.getByName(code)`; answer 503 with the Vietnamese "Đấu trường đang tạm nghỉ…" when the object call throws
  - **Done when:** worker tests cover pass-through to OpenNext, 401, 404 for an unknown room and 503; the preview still serves every page

- [x] T013 [B:T012,T009] Add `POST /api/arena/rooms`, `POST /api/arena/join`, `GET /api/arena/stats` with `src/server/arena/arena.schema.ts`, `createRoom` (code alphabet, RPC claim, up to 5 retries) and `joinRoom` (status RPC: unknown, full, started), and the `ARENA_LIMITER` binding
  - **Done when:** route tests cover 401 guest, 422 bad body, 429, 201/200 shapes, 404 and 409 (AC-003 code, AC-004, AC-005)

### Game pieces and client

- [x] T014 [P] Add `--arena-rival` (per accent, light and dark) and `--arena-gold` to `src/app/globals.css` with `tile-flip`, `tile-shake` and `score-pop` keyframes disabled under reduced motion, and the `Tile` component (`src/components/arena/tile.tsx`, `cva` with `face`, `state`, `size`)
  - **Done when:** `tile.test.tsx` covers states and sizes; every new colour pair is checked for contrast in light and dark for all five accents and the results noted in design.md

- [x] T015 [B:T003] Write `src/lib/arena-client.ts` (create, join, stats with Vietnamese errors) and `src/components/arena/use-arena-room.ts` (socket lifecycle, backoff reconnect up to the grace, clock offset from `serverNow`, state from frames, actions) plus `use-countdown.ts` and `test-room.ts` (room view builder and a spy handle) for screen tests
  - **Done when:** `use-arena-room.test.ts` with a fake WebSocket covers state frames, offset countdowns, reconnect, 4001 and error frames

- [x] T016 [B:T014,T015] Build the hub `src/app/(app)/arena/page.tsx` with `ArenaHub`: "Tạo phòng" sheet (mode, level, rounds toggle groups, unavailable modes disabled with a reason), the 6-tile code join that accepts paste, the stats line; `LockedArea` `"arena"` with its copy; `/arena` in the sitemap
  - **Done when:** component tests cover the create options, join validation and the guest prompt (AC-001, AC-002, AC-006 hub part)

- [x] T017 [P] Add "Đấu trường" (`Swords`, tour `arena`) after "Bài tập" in `src/components/shell/nav.ts` (it lands in "Thêm" on phones) and a locked tour step after "Bài tập"; update the tour order tests
  - **Done when:** nav and tour tests pass with the new item and step (AC-028)

- [x] T018 [B:T016] Build the room page `src/app/(focus)/arena/room/page.tsx` (`index: false`) with `RoomScreen`, `Lobby` and `InvitePanel` (code tiles, copy link, QR via `qrcode` pinned in the app's `package.json`), the Ready button and 30 s ring, "Bắt đầu lại" for the creator, and the guest prompt that returns to the same `?code=` after sign-in
  - **Done when:** screen tests against `FakeArenaRoom` cover AC-003, AC-004, AC-006, AC-007, AC-008, AC-009 and AC-010 views; build passes

- [x] T019 [B:T018] Build the duel frame: `Scoreboard` (chips for you and the rival, scores, round pips), `TimerBar` (warning under 5 s, destructive under 3 s), `OpponentStatus` ("đang gõ…", "sai"), the `aria-live` announcer, focus handling and the paused overlay
  - **Done when:** tests cover live announcements, the timer colours and the paused overlay (AC-012 display, AC-013 opponent side, AC-024 view)

- [x] T020 [B:T019] Build the three question views: `QuestionListen` (play button, 2×2 option tiles, keys 1–4, lock-out view), `QuestionRecall` (meaning, part of speech, `LetterSlots` fed by a real input), `QuestionWrite` (Vietnamese card, textarea, Enter sends); wrong tries shake and keep the text selected
  - **Done when:** tests cover sending answers, keys, lock-out and slots (AC-013, AC-014 views)

- [x] T021 [B:T020] Build `AnswerReveal` (tiles flipping in, "Bạn nhanh hơn! +1" / rival / "Hết giờ", IPA and audio for words), `RoundResult` (sudden-death banner), `MatchResult` (winner, round scores, record, confetti on a win, "Đấu lại" waiting state, "Về Đấu trường")
  - **Done when:** tests cover AC-018, AC-020, AC-021, AC-022, AC-026 and AC-027 views, and reduced motion leaves no keyframe animation

- [ ] T022 [B:T009,T014] Add the Arena section to Hồ sơ (`src/components/profile/arena-stats.tsx`, `src/app/(app)/profile/page.tsx`) reading `/api/arena/stats`: wins, losses, best streak, or an invite to "Đấu trường" when there are none
  - **Done when:** `arena-stats.test.tsx` covers numbers, the empty invite and a failed load (AC-030)

### End to end and launch

- [ ] T023 [B:T002,T013,T021,T017,T022] Write `e2e/specs/arena.spec.ts` with two signed-in contexts: create, join by link, both Ready, play a 1-round match (one correct answer each way, one timeout), see the result on both, stats on Hồ sơ; a reconnect within 30 s; a forfeit after 30 s; a mobile project run of create and join
  - **Done when:** `pnpm --filter learn-english e2e` passes on desktop and mobile; the round trip from a correct answer to both screens showing it is under 1 s on the preview (success criterion)

- [ ] T024 [B:T023] Visual QA: screenshots of hub, lobby, each question type, reveal, round result and match result at 375, 768 and 1280 px in light and dark into `designs/`; run the `ui-ux-pro-max` pre-delivery checklist and fix what fails
  - **Done when:** screenshots are saved and every checklist item is ticked in design.md

- [ ] T025 [B:T024] Prepare the rollout: document in knowledge.md and the app README that production needs `migrations/0006_arena.sql` applied remotely and `ARENA_SECRET` set before deploy; owner applies, sets and deploys; check on production with two accounts
  - **Done when:** a best-of-3 duel between two devices on mobile data finishes with matching results (owner-run, 10 of 10 per success criteria) and stats show on both profiles

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T016 |
| AC-002 | T004, T016 |
| AC-003 | T013, T018 |
| AC-004 | T013, T018 |
| AC-005 | T013, T016 |
| AC-006 | T016, T018 |
| AC-007 | T005, T018 |
| AC-008 | T005, T018 |
| AC-009 | T005, T018 |
| AC-010 | T005, T018 |
| AC-011 | T004, T006 |
| AC-012 | T006, T019 |
| AC-013 | T006, T019, T020 |
| AC-014 | T006, T020 |
| AC-015 | T004 |
| AC-016 | T006, T011 |
| AC-017 | T006 |
| AC-018 | T006, T021 |
| AC-019 | T004, T011 |
| AC-020 | T006, T021 |
| AC-021 | T006, T021 |
| AC-022 | T006, T021 |
| AC-023 | T011 |
| AC-024 | T007, T019 |
| AC-025 | T007, T015 |
| AC-026 | T007, T021 |
| AC-027 | T007, T021 |
| AC-028 | T017 |
| AC-029 | T009, T011 |
| AC-030 | T022 |
