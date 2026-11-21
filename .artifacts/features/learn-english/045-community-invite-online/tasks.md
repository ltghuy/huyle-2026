---
id: 045
feature: community-invite-online
created: 2026-11-21
---

# Tasks: Invite online learners to a room opened from Cộng đồng

## Summary

Total: 11 | Completed: 11 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 --┐
                         ├--> T005 --┼--> T008 --> T009 --> T010 --> T011
                         └--> T006 --┤
                   T007 ------------┘
```

- T001 to T003: the room flag, end to end (machines, DO, create routes, setup screens).
- T004 to T006 can run in parallel once the flag exists: challenge rules, online endpoint, link kind and toast.
- T007 (hook extraction) is a pure refactor and can start at any time.
- T008 to T010: the UI lists in both lobbies. T011: e2e and the closing checks.

## Quality Gates

Run after each task or batch (from the repo root):

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build` (after each group)

## Tasks

### Room remembers it came from Cộng đồng

- [x] T001 [P] Add `fromCommunity` to the duel and team machine states (set by `createRoom`/`createTeamRoom`), their public views, and the `publicRoomSchema`/`publicTeamRoomSchema` (default false)
  - **Done when:** machine tests show the flag set at create, kept through a rematch/reset, emitted in the public view, and false for a saved state without it

- [x] T002 [B:T001] Pass `fromCommunity` through the room DO `create`/`createTeam`, `status()`, `arena.service` create functions, both create body schemas and the `/rooms` and `/teams` routes
  - **Done when:** `room.test.ts` shows status carrying the flag; route tests show the body field reaching the DO and the settings still validated without it

- [x] T003 [B:T002] Add `?from=community` to the Cộng đồng empty-state links, read it in the duel and team setup "Tạo phòng" handlers, and send it through `createRoom`/`createTeamRoom` in the arena client
  - **Done when:** setup tests show `fromCommunity: true` sent with the parameter and omitted without it; community-list test shows both links carry it

### Server: who can be invited

- [x] T004 [B:T002] Rewrite challenge eligibility: host + lobby required; outside Cộng đồng, team rooms refused and non-friends refused; from Cộng đồng, any learner; team seat limit from `settings.size`; deliver `kind` + settings
  - **Done when:** new `challenge.service.test.ts` covers friend/non-friend × community/not × duel/team, team full, "here", and the delivered payload; existing challenge route tests pass unchanged

- [x] T005 [B:T002] Add `online.service.ts` (one query: presence ⋈ user ⟕ friendships, online window, not left, not me, newest first, 30) and `GET /api/arena/online?code=` gated on the caller hosting a waiting room from Cộng đồng; add `fetchOnline` to the arena client
  - **Done when:** service test covers window, left, self, isFriend, order and limit; route tests cover 401, 422, 403 (not host / not from Cộng đồng / not lobby / no room), 200

- [x] T006 [B:T002] Give the link challenge `kind` (default "duel") and a team settings arm in `LinkFrame`, its schema and the DO `Challenge` type; show team invites in the toast ("{tên} mời bạn vào phòng đội!" + team settings line)
  - **Done when:** link tests parse a duel frame without `kind` and a team frame; link-runner test renders the team toast and accepting opens the room path

### Shared invite logic

- [x] T007 [P] Extract the pending/timer/reply/cancel state from `ChallengeFriends` into `use-challenges.ts` and a reusable invite row (action label, optional "Bạn bè" tag), with no behaviour change
  - **Done when:** `challenge-friends.test.tsx` passes unchanged

### Waiting room lists

- [x] T008 [B:T003,T004,T005,T007] Build `OnlineLearners` ("Đang trực tuyến"): fetch on mount and "Làm mới" only, skeleton, error with "Thử lại", empty "Chưa có ai khác đang trực tuyến.", rows filtered by in-room ids and optionally by friends, "Mời" via the hook
  - **Done when:** `online-learners.test.tsx` covers loading, empty, error, friends hidden vs tagged, in-room filtered, Mời → "Đang chờ" + Hủy, refresh refetches

- [x] T009 [B:T008] Render `OnlineLearners` in the 1-1 lobby under "Thách đấu bạn bè" (friends hidden) when the host has a free seat and `room.fromCommunity`
  - **Done when:** `lobby.test.tsx` shows the list only for a community room's host with a free seat; a normal room is unchanged

- [x] T010 [B:T006,T008] Render `OnlineLearners` in the team lobby (friends tagged) for the host while a seat is free and `room.fromCommunity`
  - **Done when:** `team-lobby.test.tsx` shows the list for a community room's host with a free seat, hides it when full, in phases other than lobby, for non-hosts, and for normal rooms

### End to end

- [x] T011 [B:T009,T010] Add `e2e/arena-community-invite.spec.ts` (two non-friend learners: Cộng đồng → Tạo phòng 1-1 → Mời → Chấp nhận → seated) and run the full quality gates plus the existing arena e2e specs
  - **Done when:** the new spec passes on the Cloudflare preview and the existing arena specs show no new failures (known pre-existing failures noted in knowledge.md 035)

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T002, T003 |
| AC-002 | T005, T008, T009 |
| AC-003 | T004, T007, T008 |
| AC-004 | T004, T007 |
| AC-005 | T005, T008 |
| AC-006 | T008 |
| AC-007 | T004, T008, T010 |
| AC-008 | T004, T006 |
| AC-009 | T007, T010 |
| AC-010 | T009, T010 |
| AC-011 | T004 |
