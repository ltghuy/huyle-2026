---
id: 023
feature: arena
type: brownfield
scope: complex
status: to-review
branch: main
created: 2026-11-04
---

# Feature: Arena (1-on-1 duels)

## Overview

Learners study alone today: the daily lesson, review and exercises have no one to play against, and the streak board is the only thing they share. The Arena lets two signed-in learners race each other live on the same questions. One creates a room, shares its code, and the first correct answer to each question scores. It gives friends a reason to practise together and come back.

Group rooms (up to 10 players) come later. This feature covers 1-on-1 duels only, but a room should not assume it can only ever hold two players.

## Goals

- [ ] Two signed-in learners on different devices can finish a duel from room creation to result without help
- [ ] Every player in a duel sees the same question at the same time, and the same player is credited with the first correct answer on both screens

## Out of Scope

| Feature | Reason |
|---------|--------|
| Group rooms (3 to 10 players) | Planned later; 1-on-1 first |
| Quick match with a random opponent | Needs matchmaking; later |
| Spectators | Later; added by feature 026 |
| Shared chat that shows the opponent's guesses | Decided against: it lets players copy (decisions.md) |
| Points, daily streak or Ôn tập changes from a duel | Duels must not be farmable with a second account; only win/loss stats are kept (decisions.md) |
| Match review screen and "Thêm từ sai vào Ôn tập" | Not in v1 (decisions.md) |
| Guests in the Arena | Signed-in only (decisions.md) |
| AI grading | No AI at runtime (feature 001) |

## User Stories

### P1: Create a room and invite a friend

- As a signed-in learner, I want to create a room with my settings and share it so that a friend can join my duel
- **Why P1:** No duel can start without a room
- **Independent Test:** Create a room, copy the code and link, open the link in a second signed-in browser and land in the room

**Acceptance Criteria:**

- [x] AC-001: WHEN a signed-in learner opens "Đấu trường" (Arena) THEN system SHALL offer "Tạo phòng" (create a room) and a field to join by code (since feature 024 both are on `/arena/1v1`, reached from the hub's "Đấu 1-1" card)
- [x] AC-028: WHEN the app shows its menu THEN system SHALL list "Đấu trường" in the sidebar (and in the phone menu), locked for guests like the other sign-in areas
- [x] AC-002: WHEN a learner creates a room THEN system SHALL let them choose the mode ("Nghe", "Nhớ từ", "Viết câu", "Hỗn hợp"), the level (A1 to C1, their own level preselected) and the rounds (1, or best of 3)
- [x] AC-003: WHEN a room is created THEN system SHALL show its unique 6-character code, a copyable invite link that opens the room, and a QR code of that link
- [x] AC-004: WHEN a signed-in learner enters a valid code or opens an invite link THEN system SHALL put them in the room and show both players' names and avatars to both players
- [x] AC-005: WHEN a code is unknown, expired, or the room already has two players or has started THEN system SHALL say so in Vietnamese and not join (since feature 026, a room with both seats taken or a match under way still lets up to three people in to watch; only a room with five people is refused as full)
- [x] AC-006: WHEN a guest opens "Đấu trường" or an invite link THEN system SHALL show the sign-in prompt used by other locked areas, and after sign-in from an invite link SHALL continue into that room

### P1: Ready check

- As a player, I want the duel to start only when both of us are ready so that no one is caught off guard
- **Why P1:** Both players must be present before questions begin
- **Independent Test:** Join a room, press Ready on both sides and see the first question; let 30 s pass with one side not ready and see the window close

**Acceptance Criteria:**

- [x] AC-007: WHEN the second player joins THEN system SHALL open a 30-second Ready window and show its countdown to both players
- [x] AC-008: WHEN both players press "Sẵn sàng" (Ready) within the window THEN system SHALL start the match with a short countdown on both screens
- [x] AC-009: WHEN the window ends without both players ready THEN system SHALL clear both Ready marks and let the creator press "Bắt đầu" (Start) to open a new 30-second window
- [x] AC-010: WHEN a player leaves the room before the match starts THEN system SHALL tell the other player, and a creator leaving SHALL close the room

### P1: Play a round

- As a player, I want to answer timed questions faster than my opponent so that I win the round
- **Why P1:** This is the duel itself
- **Independent Test:** Play a 1-round match and check scoring, timers, reveals and the round result on both screens

**Acceptance Criteria:**

- [x] AC-011: WHEN a round starts THEN system SHALL ask 12 questions of the room's mode at the room's level, the same questions in the same order for both players
- [x] AC-012: WHEN a question shows THEN system SHALL give 15 s for "Nghe và chọn từ" (listen and select the word), 15 s for "Nhớ lại từ" (recall the word) and 30 s for "Viết câu" (write the sentence: read the Vietnamese, type the English), with the same countdown on both screens
- [x] AC-013: WHEN a player answers THEN system SHALL use only that player's own answer box, and SHALL show the opponent only that they are typing or got it wrong, never the text they typed or picked
- [x] AC-014: WHEN a player picks a wrong option in "Nghe và chọn từ" THEN system SHALL lock them out of that question; typed questions SHALL accept retries until someone is right or time runs out. "Nhớ lại từ" is typed straight into one tile per letter (no separate text box), focused as the question opens; the tiles only fill, never turn green or red, because players never receive the word (quick 054)
- [x] AC-015: WHEN a typed answer is checked THEN system SHALL grade it like the existing exercise of that type ("Viết câu" accepts the sentence's accepted word orders and approved wordings, forgiving case, punctuation, spacing and contractions)
- [x] AC-016: WHEN the first correct answer arrives THEN system SHALL give that player 1 point, end the question for both, and show who scored. "First" SHALL be decided by when the server received the answer
- [x] AC-017: WHEN time runs out with no correct answer THEN system SHALL give no point
- [x] AC-018: WHEN a question ends THEN system SHALL show the correct answer to both players for a few seconds before the next question
- [x] AC-019: WHEN a question is on screen THEN system SHALL NOT have sent its answer to either browser
- [x] AC-020: WHEN 12 questions are done THEN system SHALL show the round score, and the player with more points SHALL win the round
- [x] AC-021: WHEN a round ends tied THEN system SHALL ask a sudden-death question whose first correct answer wins the round; if nobody gets it, another follows, up to 3

### P1: Win the match

- As a player, I want a clear match result so that I know who won the duel
- **Why P1:** Ends the duel
- **Independent Test:** Play best of 3 and see it end at 2-0 without a third round

**Acceptance Criteria:**

- [x] AC-022: WHEN a player wins the rounds needed (1 of 1, or 2 of 3) THEN system SHALL end the match and show the winner and the round scores to both players
- [x] AC-023: WHEN a match ends THEN system SHALL NOT change points, the daily streak, the leaderboard or Ôn tập
- [x] AC-029: WHEN a match ends with a winner THEN system SHALL record a win for the winner and a loss for the other player on their accounts, the same on every device they sign in on
- [x] AC-030: WHEN a signed-in learner opens Hồ sơ THEN system SHALL show their Arena wins, losses and longest win streak; with no duels yet it SHALL invite them to the Arena instead

### P1: Disconnects

- As a player, I want a short drop to not cost me the match so that a flaky connection is not a loss
- **Why P1:** Mobile connections drop; without this a duel cannot finish reliably
- **Independent Test:** Turn off the network on one device mid-question, restore it within 30 s and continue; repeat and stay offline past 30 s

**Acceptance Criteria:**

- [x] AC-024: WHEN a player disconnects during a match THEN system SHALL pause the match and show the other player "Đang chờ {tên} kết nối lại…" (waiting for the player to reconnect) with a 30-second countdown
- [x] AC-025: WHEN the player reconnects within 30 s THEN system SHALL restore their view and restart the interrupted question with its full time
- [x] AC-026: WHEN the player is not back within 30 s THEN system SHALL end the match and the player who stayed SHALL win

### P2: Rematch

- As a player, I want to play again with the same opponent so that we don't have to make a new room
- As the room creator, I want to change the mode, level or rounds before the next match so that a rematch can be harder, easier or shorter
- **Why P2:** Keeps friends playing; not needed for a first duel

**Acceptance Criteria:**

- [x] AC-027: WHEN a match ends THEN system SHALL offer "Đấu lại" (rematch); WHEN both players choose it THEN system SHALL keep the room and settings and open a new Ready window with new questions
- [x] AC-031: WHEN the room is in the lobby or the Ready window THEN system SHALL let the room creator change the mode, level and rounds ("Đổi cài đặt"); WHEN they save a change THEN system SHALL clear both players' Ready, restart the 30-second window if it was open, use the new settings for the next match, and show the opponent "Chủ phòng đã đổi cài đặt: {cài đặt}"

## Edge Cases

- WHEN both players send a correct answer at almost the same moment THEN system SHALL credit only the one the server received first, and both screens SHALL agree
- WHEN a correct answer arrives after the question's time ended THEN system SHALL ignore it
- WHEN a player opens the same room in a second tab THEN system SHALL keep only the newest connection and tell the old tab
- WHEN a learner tries to join their own room as the opponent THEN system SHALL refuse
- WHEN a room stays without a second player or without starting for 10 minutes THEN system SHALL close it and its code SHALL stop working
- WHEN the level has fewer usable questions of a type than a round needs THEN system SHALL not offer that mode at that level
- WHEN the opponent, not the creator, tries to change the room's settings THEN system SHALL refuse it
- WHEN a player sends answers faster than a person could type THEN system SHALL limit them and not let them flood the room
- WHEN a player's audio cannot play THEN system SHALL let them replay it during "Nghe và chọn từ" and still count the time

## Success Criteria

- [ ] A best-of-3 duel between two devices on mobile data finishes with matching results on both screens in 10 out of 10 test runs
- [ ] The time from a correct answer to both screens showing who scored is under 1 second on a normal connection
- [ ] Running duels stays within the Cloudflare Workers free plan

## Open Questions

- None. The tour gets a locked "Đấu trường" step after "Bài tập" (design.md).

## Notes

- Decisions and their reasons: decisions.md
- Research on hosting live rooms within the free plan: `.artifacts/research/learn-english-realtime-arena.md`. It estimates room for about 400 full best-of-3 duels a day.
- Builds on Google sign-in (feature 022) for player identity, and on the existing listening, recall and translate exercises (features 001 and 016) for questions and grading.
- Timings proposed by the owner: Ready window 30 s; 15 s, 15 s and 30 s per question type; 12 questions per round.

## Baseline

### Current Behavior

- Learners practise alone. The only thing shared between learners is the streak board.
- "Nghe và chọn từ", "Nhớ lại từ" and "Dịch câu" exist as solo exercises with their own grading.

### Gaps / Limitations

- No way to play with or against a friend.
- No live interaction between learners: everything is saved in the browser or synced later.
