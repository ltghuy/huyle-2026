---
id: 007
feature: weekly-leaderboard
created: 2026-10-28
---

# Technical Design: Weekly leaderboard after the daily lesson

## Scope

In: one new D1 table, `POST`/`DELETE /api/leaderboard`, a rate limit binding, a
`leaderboard` field on the profile (backups and sync carry it), the consent
dialog and the animated board after the daily lesson, a Settings section.
Out: anything in the anonymous stats; a board page; leagues.

## Research Summary

- Codebase only, no new libraries. Patterns come from the sync API (bearer
  secret hashed with SHA-256, one `db.batch()` per request, a Workers rate
  limit binding with a fallback when it is missing) and from the stats client
  (fire-and-forget, never blocks learning).
- Drizzle 0.45 SQLite `onConflictDoUpdate({ target, set, setWhere })` gives a
  guarded upsert in one statement; `.returning()` tells whether it applied.

## Patterns & Reuse

### Conventions to Follow

- Route handlers stay thin: parse with Zod, call the service, respond; Vietnamese `error.message`; `Cache-Control: no-store` like `/api/sync`.
- One D1 call (`db.batch`) per request; `getDb()` per request.
- Pure rules in `src/learning/` (week key, weekly points, name check, the slide offsets), no React or fetch.
- Profile fields change through `updateProfile` so `fieldUpdatedAt` drives last-writer-wins in sync.

### Existing Code to Reuse

- `cleanName` (`src/learning/name.ts`) for the name rules.
- `localDate`, `Attendance` (`src/learning/attendance.ts`) for weekly points.
- `hashSyncCode`-style SHA-256 hex (`src/server/sync/code.ts`) for the secret.
- `isLookupThrottled` shape (`src/server/sync/throttle.ts`) for the limiter.
- The fake D1 in `src/server/sync/sync.service.test.ts` for service tests.

## Data Model

### Entities

#### leaderboard_entries (D1)

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Random id made in the browser (UUID) |
| `token_hash` | text | SHA-256 hex of the browser's secret |
| `name` | text | Shown name, checked by the name rules |
| `week` | text | ISO week of the learner's local date, `2026-W44` |
| `points` | integer | Attendance points this week |
| `reached_at` | integer | When `points` last went up (ties: earlier ranks higher) |
| `updated_at` | integer | Last write; rows untouched for 90 days are deleted |

Index `(week, points)`. One row per learner: a new week overwrites `week` and
`points`, so a learner who hasn't posted this week isn't on this week's board.

#### Profile.leaderboard (IndexedDB, backups, sync)

`{ status: "joined" | "declined"; id?: string; token?: string; name?: string }`,
undefined until answered. Travels in backups and sync like the other profile
fields (last change wins), so devices share one entry (AC-011).

### Relationships

None: entries are not linked to stats, sync rows or devices.

### API Contracts

`POST /api/leaderboard` with `{ id, token, name, week, points, previousPoints }`
→ 200 `{ rank, previousRank, total, rows: [{ position, name, points, me }] }`.
403 when the id exists with another secret; 422 for a bad body or name; 429
when throttled; 503 when the database fails.

`DELETE /api/leaderboard` with `{ id, token }` → 204 (also when there was no entry).

Limits: `points` and `previousPoints` 0–300 (7 × 10 a day plus the 20, 30 and 100
streak bonuses is 220), `previousPoints <= points`, name per AC-012.

### Currently Exposed Fields

Responses expose only the shown names and weekly points of up to 7 rows
around the learner, never ids, secrets or other weeks.

## Decisions

| Decision | Rationale |
|----------|-----------|
| A separate table, not `stats_devices` | Device hashes change daily by design and stats are promised anonymous (001 AC-056) |
| The browser reports `previousPoints` | It knows its points before this lesson; the server then ranks both in the same batch. Points are self-reported anyway |
| Rank = 1 + learners with more points; ties by `reached_at` | Stable and one indexed `COUNT(*)` |
| Positions of neighbours are counted from the learner's rank | Shown as consecutive places like Duolingo; ties don't skip numbers |
| Guarded upsert (`setWhere token_hash = excluded.token_hash`) | One statement; a wrong secret changes nothing and returns no row |
| Rate limit `LEADERBOARD_LIMITER` 20 per 60 s per IP | A learner posts once a day; stops scripted spam |
| Consent asked once, after an awarded daily lesson | The moment the board means something; "declined" is remembered |
| CSS transforms for the slide (no animation library) | Up to 7 rows; `motion-reduce` skips it |

## Component Design

- `src/learning/leaderboard.ts`: `weekKey(date)`, `weekPoints(attendance, date)`, `checkBoardName(raw)`, `slideOffsets(rows, previousPoints)`.
- `src/server/leaderboard/leaderboard.schema.ts`, `leaderboard.service.ts` (`submitEntry`, `removeEntry`), `throttle.ts`; `src/app/api/leaderboard/route.ts`.
- `src/lib/leaderboard-client.ts`: `joinBoard`, `submitWeek`, `leaveBoard`.
- `src/components/leaderboard/`: `board-consent.tsx` (dialog), `weekly-board.tsx` (animated list), `board-after-lesson.tsx` (decides which to show), `leaderboard-setting.tsx` (Settings).

## Visual Design Considerations

Dialog over the "Hoàn thành bài hôm nay!" screen. Header "Bảng xếp hạng tuần này", a line "Bạn lên hạng N, vượt qua K bạn!" or "Bạn đang hạng N trong M bạn". Rows: place number, name, points; the learner's row tinted with `bg-primary/10` and bold. Slide 700 ms ease-out after 300 ms, passed rows shift down at the same time; the place number counts from old to new. Theme tokens only.

## Data Flow

1. Lesson completes and is awarded → `BoardAfterLesson` reads the profile.
2. No answer yet → consent dialog → join saves `{ status: "joined", id, token, name }` → step 3. Decline saves `{ status: "declined" }`.
3. Joined → `submitWeek` computes `week`, `points`, `previousPoints` from attendance and posts → `WeeklyBoard` animates the result. Failure → "Chưa tải được bảng xếp hạng".
4. Settings leave → `DELETE` then `{ status: "declined" }`; rename → `POST` with the new name, then save it.

## Requirements Traceability

| AC | Where |
|----|-------|
| AC-001–AC-003, AC-006 | `board-after-lesson.tsx`, `weekly-board.tsx`, service ranking |
| AC-004 | `weekly-board.tsx` (`motion-reduce`) |
| AC-005 | `weekKey`, `weekPoints` |
| AC-007, AC-008 | `board-consent.tsx`, profile `leaderboard` |
| AC-009, AC-010 | `leaderboard-setting.tsx`, `DELETE` |
| AC-011 | profile field in snapshot and merge |
| AC-012, AC-013 | `checkBoardName` in client and route |
| AC-014 | guarded upsert, guarded delete |
| AC-015 | Zod limits |
| AC-016 | `LEADERBOARD_LIMITER` |

## Test Strategy

### Infrastructure

Vitest; the fake D1 pattern from the sync service tests; component tests with `@/test-utils/render` and a stubbed `fetch`.

### Reference Tests

`src/server/sync/sync.service.test.ts`, `src/app/api/sync/route.test.ts`, `src/components/settings/sync-panel.test.tsx`.

### New Tests

- `src/learning/leaderboard.test.ts`: week keys across years, weekly points, name check, slide plan.
- `src/server/leaderboard/leaderboard.service.test.ts` and `src/app/api/leaderboard/route.test.ts`: ranking statements, wrong secret, limits, throttle.
- `src/components/leaderboard/*.test.tsx`: consent once, board rows and moved-up text, failure message, Settings leave.
- `src/learning/snapshot.test.ts`, `merge.test.ts`: the new profile field survives backup and sync.

## Considerations

### Error Handling

The board never blocks the lesson: every client call catches and shows a message; points stay in the browser and are sent in full (weekly total) next time.

### Security

Secret hashed at rest; requests without the right secret change nothing; names filtered server-side; rate limit per IP (IP never stored); responses expose only shown names and points.

## Open Questions

None.
