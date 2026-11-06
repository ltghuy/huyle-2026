---
id: 026
feature: arena-spectators
type: brownfield
scope: large
status: to-review
branch: main
created: 2026-11-06
---

# Feature: Arena spectators

## Overview

A 1-1 Arena room holds two people today. Once both seats are taken, anyone else who opens the invite link or types the code is turned away with "Phòng đã đủ người." Friends who want to watch a match have no way in. This feature lets up to three more people into a room as spectators: they see the match live but can't answer, press Ready or change anything. A room holds at most five people (two players and three spectators); the sixth is refused as full.

## Goals

- [ ] Up to three signed-in learners can watch a 1-1 match live from its link or code once both seats are taken
- [ ] A spectator can never change a match: no answer, Ready, start, settings, rematch or forfeit from a spectator is counted

## Out of Scope

| Feature | Reason |
|---------|--------|
| A spectator taking a free seat from the watch screen | A spectator who wants to play leaves and joins again; the free seat goes to whoever joins first |
| Chat or reactions from spectators | Not asked for |
| Spectators in match history or stats | Only the two players played the match |
| Guests watching without signing in | Rooms already need sign-in (feature 023, AC-006) |
| Choosing the spectator limit per room | Fixed at three |

## User Stories

### P1: Watch a match

- As a learner with a room's link or code, I want to get in and watch when both seats are taken, so that I can follow my friends' match.
- **Why P1:** It is the request.
- **Independent Test:** Two players start a match; a third learner opens the link and sees the live match without any way to answer.

**Acceptance Criteria:**

- [x] AC-001: WHEN a signed-in learner joins a room whose two seats are taken (in the lobby, the Ready window, a match, a pause or the match result) and the room has fewer than three spectators THEN system SHALL let them in as a spectator
- [x] AC-002: WHEN a learner joins a room in the lobby with a free seat THEN system SHALL seat them as a player, as before
- [x] AC-003: WHEN a room already has two players and three spectators THEN system SHALL refuse a new learner with "Phòng đã đủ người." and not let them in
- [x] AC-004: WHEN a spectator is in the room THEN system SHALL show them the same live room the players see: both players' names, avatars and scores, the question, its timer, who is typing or answered wrong, the reveal, pauses, round results and the match result, naming each player instead of "Bạn"
- [x] AC-005: WHEN a spectator views the room THEN system SHALL show no Ready, start, settings, answer, rematch or forfeit controls, and SHALL say they are watching ("Bạn đang xem trận đấu")
- [x] AC-006: WHEN a spectator's device sends an answer, Ready, start, settings, rematch, typing or leave message THEN system SHALL not change the match because of it (a spectator's leave only takes them out of the room)

### P2: Know who is watching

- As a player, I want to see how many people are watching, so that a spectator joining doesn't surprise me.

**Acceptance Criteria:**

- [x] AC-007: WHEN a room has spectators THEN system SHALL show everyone in the room how many are watching ("N người đang xem")
- [x] AC-008: WHEN a spectator leaves or loses their connection THEN system SHALL free their place right away and update the count

## Edge Cases

- WHEN a spectator opens the room in a second tab THEN system SHALL keep one place for them and close the older tab, as for players
- WHEN a spectator's connection drops and they come back THEN system SHALL treat them as a new arrival: back in if a place is free, refused as full if not, seated as a player if a lobby seat is free
- WHEN the room closes (creator leaves the lobby, idle timeout, no questions) THEN system SHALL close it for spectators too, with the same message
- WHEN a player leaves the lobby while spectators watch THEN system SHALL keep the spectators watching and give the free seat to the next learner who joins
- WHEN the match ends THEN system SHALL show spectators the winner and each round's score, with only a way back to the Arena
- WHEN a spectator leaves mid-match THEN system SHALL not count it as a forfeit for anyone
- WHEN a room was open before this change THEN system SHALL keep working with no spectators

## Success Criteria

- [ ] A match with three spectators runs to the end with the same result and history as one without
- [ ] A sixth learner is always refused, both when asking to join and when opening the room's connection directly

## Open Questions

- None

## Notes

- Requested by the owner on 2026-11-06. Feature 023 listed "Spectators" as out of scope for later.
- Changes feature 023's AC-005: a full or started room is no longer refused while it has room for spectators.

## Baseline

### Current Behavior

- A room holds two players. A third learner is refused with "Phòng đã đủ người.", and anyone joining after the match started is refused with "Trận đấu trong phòng này đã bắt đầu."

### Gaps / Limitations

- Friends can't watch a match.
