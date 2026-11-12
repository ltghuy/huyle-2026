---
id: 041
feature: arena-community
type: brownfield
scope: complex
status: done
branch: main
created: 2026-11-12
---

# Feature: "Cộng đồng" in the Arena

## Overview

An Arena room can only be found by its code today: the host has to send the code or link to someone, or challenge an online friend (feature 035). A learner with no friend online has nobody to play. This feature adds a "Cộng đồng" card to the Arena hub, under "Đấu 1-1" and "Đấu đội". The host of a waiting room can make it public, and every signed-in learner who opens "Cộng đồng" sees the public rooms that still have a free seat, of both kinds, and joins one with a tap, as if they had typed its code. A room leaves the list when its match starts.

## Goals

- [x] A learner with no friend online can find a waiting room and play, with no code passed around
- [x] A host can fill a room's free seats from the community in one tap

## Out of Scope

| Feature | Reason |
|---------|--------|
| A list that updates by itself | The owner chose a "Làm mới" button (2026-11-12); rooms can fill between two refreshes, and joining then says so |
| Making a public room private again | The owner didn't pick it (2026-11-12); a public room stays public until its match starts or it closes |
| Matchmaking (being paired with a stranger automatically) | Learners pick a room themselves |
| Watching a public match | Spectating (feature 026) still needs the code; the list only offers seats |
| Chat or reporting in the community | No user-written text is shown beyond the names the Arena already shows |

## User Stories

### P1: Make a waiting room public

- As a host, I want to put my waiting room in "Cộng đồng" so that someone I don't know can join it
- **Why P1:** nothing appears in the community without it
- **Independent Test:** create a 1-1 room, tap "Công khai lên Cộng đồng", open "Cộng đồng" as another learner and see the room

**Acceptance Criteria:**

- [x] AC-001: WHEN the host is in the lobby of a 1-1 room whose second seat is free, or of a team room with a free seat, THEN system SHALL offer "Công khai lên Cộng đồng" to the host only
- [x] AC-002: WHEN the host taps it THEN system SHALL make the room public, replace the button with "Phòng đang hiện trên Cộng đồng" for everyone in the room, and list the room in "Cộng đồng" from the next load or refresh of the list
- [x] AC-003: WHEN a public room has no free seat (a 1-1 room once its opponent is seated; a team room once every seat is taken) THEN system SHALL leave it out of the list, and SHALL list it again if a seat frees up while it is still in the lobby
- [x] AC-004: WHEN a public room's match starts (1-1: the countdown after both are ready; team: the host starts) or the room closes THEN system SHALL remove it from the list for good; the room is not public after the match, and the host can make the next lobby public again
- [x] AC-005: WHEN the host changes the room's settings while it is public THEN system SHALL show the new settings in the list

### P1: Find and join a public room

- As a learner, I want to see the rooms waiting for players and join one so that I can play now
- **Why P1:** it is the reason for the list
- **Independent Test:** with a public room open, open "Cộng đồng", tap "Vào phòng" on it and land in its lobby seated

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner opens the Arena hub THEN system SHALL show a "Cộng đồng" card under the "Đấu 1-1" and "Đấu đội" cards, leading to the community page
- [x] AC-007: WHEN a signed-in learner opens the community page THEN system SHALL list the public rooms with a free seat, newest first, each with the host's name and avatar, the kind ("Đấu 1-1" or "Đấu đội"), the mode, the level, the rounds and the seats taken ("1/2", "3/6")
- [x] AC-008: WHEN the learner picks a kind (Tất cả, Đấu 1-1, Đấu đội) or a level (each level, or Tất cả trình độ) THEN system SHALL show only matching rooms; the level starts at the learner's own level
- [x] AC-009: WHEN the learner taps "Làm mới" THEN system SHALL load the list again; the list does not change on its own
- [x] AC-010: WHEN the learner taps "Vào phòng" on a room THEN system SHALL join it exactly as typing its code does (same name, same checks) and open the room
- [x] AC-011: WHEN the room filled, started or closed since the list was loaded THEN system SHALL say why above the list, naming the host ("Phòng của Lan: Phòng đã đủ người.", with the join's usual messages), and reload the list; a full 1-1 room SHALL refuse the learner rather than seat them as a spectator
- [x] AC-012: WHEN a room is the learner's own THEN system SHALL mark it "Phòng của bạn" and its button SHALL say "Quay lại phòng"

### P2: Empty and guest states

- As a learner, I want to know what to do when nobody is waiting so that I don't leave empty-handed
- **Why P2:** the list will often be empty early on

**Acceptance Criteria:**

- [x] AC-013: WHEN no public room matches THEN system SHALL say so and offer "Tạo phòng 1-1" and "Tạo phòng đội"; with a filter on, it SHALL also offer to clear the filters
- [x] AC-014: WHEN a guest opens the community page THEN system SHALL ask them to sign in, like the rest of the Arena

## Edge Cases

- WHEN the host leaves and the room closes, or the room idles out THEN system SHALL remove it from the list
- WHEN a listed room was not removed (the room failed mid-write) THEN system SHALL stop listing it 2 hours after its last update, and joining it SHALL fail with the usual message
- WHEN the host's account is deleted THEN system SHALL remove their public rooms with it
- WHEN 50 or more rooms match THEN system SHALL show the 50 newest
- WHEN the community API can't be reached THEN system SHALL show the existing load error with "Thử lại"
- WHEN a spectator or a guest invited by code is in a public 1-1 room THEN system SHALL still count only the two seats

## Success Criteria

- [x] Two learners who are not friends start a 1-1 match through "Cộng đồng" with no code sent between them
- [x] A team room of 4 fills from "Cộng đồng" and disappears from the list when the host starts
- [x] The Arena tests, the quality gates and the Arena e2e specs pass

## Open Questions

- None

## Notes

Requested by the owner on 2026-11-12 with a screenshot of the hub. Answers the same day: refresh button rather than live updates; a public room is hidden while it has no free seat; each row shows the details with kind and level filters; any signed-in learner can join. "Host can make it private again" was offered and not chosen.

## Baseline

### Current Behavior

- The hub shows "Đấu 1-1", "Đấu đội", "Vào phòng bằng mã" and "Lịch sử đấu"
- A room is reachable only by its code or link, or by a challenge to an online friend

### Gaps / Limitations

- A learner without an online friend can't find anyone to play with

## Verification

- 2026-11-12: `pnpm --filter learn-english typecheck`, `lint` and `build` pass; `pnpm --filter learn-english test`: 188 files, 1635 tests pass. New tests: `src/learning/arena/community.test.ts` (publish rights, listing per kind, phase and seats, cleared at start: AC-001 to AC-005), `src/server/arena/community.test.ts` (D1 list: details, filters, replace, remove, 2 h cutoff and prune, 50 cap, account deletion), `src/server/arena/room.test.ts` (row written on publish and settings change, deleted when full, started or closed, even after a wake; no writes for a room never made public), `src/app/api/arena/routes.test.ts` (filters, 401, 422, 503; `seatOnly` passed on), lobby and team lobby tests (AC-001 to AC-003), hub test (AC-006), `community-list.test.tsx` (AC-007 to AC-013). AC-014 is the shared `SignInGate` (same as `/arena/history`).
- Local D1: migration `0012_arena_community.sql` applied.
- E2E on the Cloudflare preview, `--workers 1`: `arena-community.spec.ts` (Quang publishes a 1-1 room, Phương opens Cộng đồng from the hub, sees "Quang · Đấu 1-1 · A2 · 1 hiệp · 1/2", joins with no code, both see each other, the room is gone from the list) passes, with `arena.spec.ts`, `arena-team.spec.ts` and `arena-challenge.spec.ts`: 7 of 7 in 3.3 min.
- Not checked: the page by eye in a browser (the headless browser used for checks is a guest locally, and e2e has no screenshot step for it).

## Audit

- 2026-11-12: Goal 1 holds (two learners who aren't friends start a duel through Cộng đồng with no code: e2e). Goal 2 holds (one tap publishes; the room fills from the list: e2e for 1-1, room test for a team room). Success criteria: the 1-1 flow (e2e); a team room of 4 listed with its seats and removed at the start (room test, not e2e); tests, gates and Arena e2e pass.
