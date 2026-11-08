---
id: 031
feature: arena-friends
created: 2026-11-08
---

# Tasks: Arena friends

Paths are relative to `apps/learn-english/`.

## Summary

Total: 20 | Completed: 20 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 --┐
                         ├--> T005 --┼--> T007 --> T008 --> T009 --┬--> T011 --> T012 --┐
                         └--> T006 --┘                             ├--> T013 ----------┤
                                                                   ├--> T014 --> T015 -┼--> T019 --> T020
                                                                   └--> T016 ----------┤
                                                  T010 [P] ----------------------------┤
                                                  T017 [P] --> T018 -------------------┘
```

T004 to T006 (server services) can run as parallel sub-agents once the schema exists. After the client query (T009), the sidebar, the bell, the Arena buttons and the phone section are independent branches.

## Quality Gates

Run after each task or batch (from the repo root):

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build` (end of each group)

## Tasks

### Data model

- [x] T001 [P] Add `friendships`, `friendRequests`, `presence` and `notifications` to `src/server/db/schema.ts` with the columns, primary keys, indexes, unique key and cascading foreign keys from the design
  - **Done when:** typecheck passes and the schema exports all four tables

- [x] T002 [B:T001] Generate `migrations/0008_social.sql` with drizzle-kit and apply it to the local D1 and the e2e seed
  - **Done when:** the SQL creates exactly the four tables and their indexes, `wrangler d1 migrations apply learn-english --local` succeeds, and `pnpm e2e:seed` runs clean

### Social service

- [x] T003 [B:T002] Create `src/server/social/social.schema.ts` (Zod bodies, response types, `SOCIAL_MESSAGES` in Vietnamese, timing and limit constants) and `src/server/social/request.ts` (`json`, `error`, `readBody` with a 1 KB cap, `isThrottled` on `SOCIAL_LIMITER`); add the `SOCIAL_LIMITER` binding (namespace 1006, 20 per 60 s) to `wrangler.jsonc` and run `pnpm cf:typegen`
  - **Done when:** typecheck passes with the new binding type and the module has no `server-only` import in the schema file

- [x] T004 [P] [B:T003] Implement `src/server/social/presence.ts`: `pulse` (upsert only when `left` or older than 45 s), `leave`, `isOnline` (150 s window), with tests
  - **Done when:** `presence.test.ts` proves first insert, no write when fresh, update when stale or left, leave, and both edges of the online window

- [x] T005 [P] [B:T003] Implement `src/server/social/friends.ts`: `sendRequest` (self and missing user refused, reverse pending accepts, 20 pending cap, 7-day decline block and expiry, request notification upsert), `respond` (accept batch: delete both requests, two friendship rows, notification to `friend_added`, `friend_accepted` for the sender; decline: status declined, notification deleted; vanished request: `gone`), `removeFriend` (both rows), `listFriends` (name, image, online, last seen), `requestIds` (outgoing incl. blocked declines, incoming), with tests
  - **Done when:** `friends.test.ts` covers every case listed and passes

- [x] T006 [P] [B:T003] Implement `src/server/social/notifications.ts`: `listNotifications` (prune over 30 days, 50 newest, actor name and picture, `pending` flag), `markAllRead`, `unreadCount`, with tests
  - **Done when:** `notifications.test.ts` proves the limit, the prune, the flag, read marking, the count and that only the owner's rows come back

- [x] T007 [B:T004,T005,T006] Add the routes under `src/app/api/social/` (`pulse`, `leave`, `requests`, `requests/respond`, `friends/[userId]`, `notifications`, `notifications/read`), each thin over the services with `requireUser`, throttling on `requests`, and 503 with the Vietnamese message on failure
  - **Done when:** `src/app/api/social/routes.test.ts` shows 401 for guests on every route, 422 on bad bodies, 429 when throttled, and that each route uses only the session's id

- [x] T008 [B:T007] Expose `opponent.id` in match history (`src/server/arena/history.ts`, `src/server/arena/arena.schema.ts`) and update the account deletion doc comment and test to cover the four new tables
  - **Done when:** `history.test.ts` asserts the id (null opponent stays null) and `account.service.test.ts` proves friendships, requests, presence and notifications are gone after deletion

### Client data

- [x] T009 [B:T008] Create `src/lib/social-client.ts` (`SocialError`, `pulse`, `sendRequest`, `respond`, `removeFriend`, `fetchNotifications`, `markRead`), `src/components/social/use-social.ts` (`SOCIAL_KEY`, 60 s interval also in background, enabled only when signed in, `relation(userId)`), and `src/components/social/presence-runner.tsx` (BroadcastChannel tab set, `pagehide` beacon from the last tab, refetch on `pageshow`), mounted in `src/app/(app)/layout.tsx`
  - **Done when:** tests prove the query is off for guests, `relation` returns each state, and the runner sends the beacon only when no other tab answered

- [x] T010 [P] Create `src/components/social/last-active.ts` with the Vietnamese status lines and short notification times, with tests
  - **Done when:** `last-active.test.ts` covers just now, minutes, hours, yesterday, days, the date after 7 days and never active, with a fixed `now`

### Friends list

- [x] T011 [B:T009,T010] Add the shadcn `dropdown-menu` primitive (fix its `cn` import if needed) and build `src/components/social/friends-list.tsx`: rows with avatar, status dot and line, online first then by last active, "N/M đang trực tuyến", empty state linking to Đấu trường, load error with retry, row menu "Xóa bạn" with an `AlertDialog` confirm
  - **Done when:** `friends-list.test.tsx` covers order, count, empty, error and retry, and removal calling the client after confirm

- [x] T012 [B:T011] Add the "Bạn bè" group to `src/components/shell/app-sidebar.tsx` under the navigation, its list scrolling on its own with the footer pinned, and the collapsed icon with the online count that expands the sidebar; signed-in only
  - **Done when:** a test shows the section for signed-in learners and not for guests, the collapsed icon expands the sidebar, and in `pnpm dev` (mocked data) a long list scrolls without moving the navigation

- [x] T013 [B:T011] Show `FriendsList` on the Đấu trường hub (`src/components/arena/arena-hub.tsx`) below `md` only
  - **Done when:** `arena-hub.test.tsx` finds the section for signed-in learners and it is hidden at `md` and up

### Bell

- [x] T014 [B:T009,T010] Add the shadcn `popover` primitive (fix its `cn` import if needed) and build `src/components/social/notification-bell.tsx`: badge with count and "9+", `aria-label="Thông báo"`, popover with newest-first items, unread marks, relative times, "Đồng ý"/"Từ chối" on pending requests, "Chưa có thông báo nào.", "Lời mời này không còn nữa." on a `gone` answer; opening fetches the list and marks all read
  - **Done when:** `notification-bell.test.tsx` covers the badge, "9+", mark read on open, accept, decline, empty and gone

- [x] T015 [B:T014] Put the bell in `src/components/shell/account-link.tsx` before the greeting, signed-in only, sized like the avatar link
  - **Done when:** an account link test shows the bell for signed-in learners and not for guests, on phone and desktop widths

### Arena buttons

- [x] T016 [B:T009] Build `src/components/social/friend-button.tsx` (Kết bạn, Đã gửi lời mời, Bạn bè, nothing for self; optimistic update with rollback and toast) and place it via a new `action` slot on `PlayerRow` in the lobby and Ready window, next to the opponent in `results.tsx` (both players for spectators), and in `match-details.tsx` when `opponent.id` is set
  - **Done when:** `friend-button.test.tsx` covers each state, the optimistic switch and the rollback; lobby, results and match history tests find the button where AC-001 and AC-002 say and not during a question

### Privacy

- [x] T017 [P] Write the Vietnamese privacy page additions in `src/app/(app)/privacy/page.tsx`: what friends see (account name, picture, online, last active), what is stored (friendships, requests, notifications, last active time), and that deleting the account removes it all
  - **Done when:** `privacy/page.test.tsx` finds the new statements

- [x] T018 [B:T017] Check the terms page and the privacy page's data list for any other spot that names what the Arena stores, and update it to match
  - **Done when:** no legal text contradicts the new storage, verified by reading both pages

### End to end

- [x] T019 [B:T012,T013,T015,T016,T018] Write `e2e/arena-friends.spec.ts` with the two seeded accounts: Minh sends a request from match history while Lan is away; Lan signs in and sees 1 on the bell; Lan accepts; both sidebars list each other online; Minh's bell says Lan accepted; Minh removes Lan and both lists empty
  - **Done when:** the spec passes on `pnpm --filter learn-english e2e` (desktop project) and a mobile variant finds the list on the Đấu trường page

- [x] T020 [B:T019] Record the rollout note in `.agents/knowledge.md` (apply `0008_social.sql` remotely and add `SOCIAL_LIMITER` before pushing) and any gotchas met during implementation
  - **Done when:** the knowledge entries exist under `### learn-english` with the feature tag

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T016 |
| AC-002 | T008, T016 |
| AC-003 | T005, T009, T016 |
| AC-004 | T005, T006, T014 |
| AC-005 | T005, T014 |
| AC-006 | T005, T014 |
| AC-007 | T009, T016 |
| AC-008 | T005, T016 |
| AC-009 | T007 |
| AC-010 | T005, T011, T012 |
| AC-011 | T012 |
| AC-012 | T004, T011 |
| AC-013 | T010, T011 |
| AC-014 | T011 |
| AC-015 | T004, T009 |
| AC-016 | T011 |
| AC-017 | T013 |
| AC-018 | T009, T012 |
| AC-019 | T011 |
| AC-020 | T005, T011 |
| AC-021 | T017, T018 |
| AC-022 | T014, T015 |
| AC-023 | T006, T014 |
| AC-024 | T006, T014 |
| AC-025 | T014 |
| AC-026 | T009 |
| AC-027 | T009 |
| AC-028 | T005, T019 |
| AC-029 | T001, T005, T014 |
| AC-030 | T015 |
| AC-031 | T006, T007 |
