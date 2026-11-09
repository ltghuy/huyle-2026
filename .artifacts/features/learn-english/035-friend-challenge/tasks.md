---
id: 035
feature: friend-challenge
created: 2026-11-09
---

# Tasks: Challenge a friend from the waiting room

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004
T001 --> T005 --> T006 --> T007
                  T004 --> T007 --> T008
```

## Quality Gates

Run after each task or batch:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test

## Tasks

### Server

- [x] T001 Add the link protocol (`src/learning/arena/link.ts`) with tests
  - **Done when:** frames parse and reject bad input in tests

- [x] T002 [B:T001] Add `LearnerLink` Durable Object, its binding and migration, and export it from `worker.ts`
  - **Done when:** deliver/cancel/reply and answer handling pass unit tests; `pnpm cf:typegen` shows `LEARNER_LINK`

- [x] T003 [B:T002] Route `/api/arena/link/socket` in the socket route, and add `POST /api/arena/link` for the ticket
  - **Done when:** socket-route tests cover the link path; the ticket route returns a ticket for a signed-in learner

- [x] T004 [B:T002] Add the challenge service and the challenge and cancel routes
  - **Done when:** service tests cover every refusal and each delivery state

### Browser

- [x] T005 [B:T001] Add the link client (`src/lib/link-client.ts`): connect, reconnect, room report, listeners
  - **Done when:** reconnect and room report re-send are unit tested

- [x] T006 [B:T005] Add `LinkRunner` to the root layout with the friend's toast; report the open room from the room screen
  - **Done when:** toast tests pass (accept navigates, decline, closed, expiry)

- [x] T007 [B:T004,T006] Add `ChallengeFriends` to the host's lobby
  - **Done when:** component tests pass for AC-001 to AC-003, AC-005 to AC-010 host side

- [x] T008 [B:T007] End-to-end check in two browsers on the Cloudflare preview; knowledge entries
  - **Done when:** challenge, accept, decline, busy and expiry seen working; gates and build pass

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002 | T007 |
| AC-003 | T002, T004, T007 |
| AC-004 | T006 |
| AC-005, AC-006 | T002, T006, T007 |
| AC-007 | T002, T006 |
| AC-008 | T002 |
| AC-009 | T006, T007 |
| AC-010 | T004, T007 |
| AC-011 | T002 |
