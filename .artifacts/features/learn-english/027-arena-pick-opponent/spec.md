---
id: 027
feature: arena-pick-opponent
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-06
---

# Feature: Host picks the next opponent

## Overview

With spectators in a room (feature 026), a match ends with up to five people still there, but only the same two players can play again ("Đấu lại" needs both). A friend who watched has to leave and wait for a new room. This feature lets the room's host, once a match ends, choose who plays them next from everyone still in the room: the last opponent or any spectator. The chosen learner takes the second seat, the last opponent watches instead, and the usual Ready window starts.

## Goals

- [ ] After a match, the host can start the next match against any learner still in the room in one tap, without anyone leaving or making a new room
- [ ] The room never has more than two players or more than five people, whatever the host picks

## Out of Scope

| Feature | Reason |
|---------|--------|
| Picking an opponent before the first match | The first opponent is whoever joins the free seat (feature 023) |
| A non-host choosing who plays | The host runs the room |
| The chosen learner declining with a button | Not pressing Ready within 30 s already declines (feature 023, AC-009) |
| A queue or rotation of challengers | Not asked for |

## User Stories

### P1: Host picks who plays next

- As the room's host, when a match ends, I want to choose who I play next from everyone in the room, so that friends who watched get a turn.
- **Why P1:** It is the request.
- **Independent Test:** Host and a player finish a match while a spectator watches; the host picks the spectator; the spectator gets the Ready button and the former opponent sees the room as a spectator.

**Acceptance Criteria:**

- [x] AC-001: WHEN a match ends THEN system SHALL show the host every other connected person in the room (the last opponent and each spectator) as a choice for the next match ("Chọn đối thủ trận sau")
- [x] AC-002: WHEN the host picks a spectator THEN system SHALL seat that learner as the second player, move the last opponent to the spectators if they are still connected (out of the room if not), and open the 30-second Ready window with new questions, the same settings and fresh scores
- [x] AC-003: WHEN the host picks the last opponent THEN system SHALL open the Ready window for the same two players with new questions, as a rematch does
- [x] AC-004: WHEN anyone other than the host tries to pick, or the match hasn't ended THEN system SHALL change nothing
- [x] AC-005: WHEN the pick is someone no longer connected or not in the room THEN system SHALL change nothing and tell the host "Người này đã rời phòng."
- [x] AC-006: WHEN the host has picked THEN system SHALL show the chosen learner the Ready button, and show everyone else who will play next

### P2: Everyone else knows what's happening

**Acceptance Criteria:**

- [x] AC-007: WHEN a match ends THEN system SHALL tell spectators and the last opponent that the host is choosing the next opponent ("Chủ phòng đang chọn đối thủ trận sau…"), while "Đấu lại" keeps working for the two players

## Edge Cases

- WHEN the last opponent had asked for "Đấu lại" and the host picks someone else THEN system SHALL drop that request
- WHEN the chosen learner doesn't press Ready within 30 s THEN system SHALL go back to the lobby with them seated, as for any Ready window (feature 023, AC-009)
- WHEN the host has left the room THEN system SHALL offer no picking; the two players can still rematch as before
- WHEN the host picks twice quickly THEN system SHALL apply only the first pick (the match is no longer over after it)

## Success Criteria

- [ ] A host, a player and three spectators can play several matches in a row, each against a different opponent, without anyone rejoining
- [ ] Each of those matches appears only in its own two players' history and stats

## Open Questions

- None

## Notes

- With nobody watching, the result screen is unchanged: both players press "Đấu lại". With spectators, the host's "Đấu lại" button becomes the picker (the last opponent is the first choice) and the other player can still press "Đấu lại".

- Requested by the owner on 2026-11-06, right after feature 026. "The next round" is read as the next match.
- The chosen learner accepts by pressing Ready; that keeps anyone from being pulled into a match they didn't agree to.

## Baseline

### Current Behavior

- After a match only the same two players can play again, and only when both press "Đấu lại". Spectators can only watch.

### Gaps / Limitations

- Spectators never get a turn in the room they're in.
