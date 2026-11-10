---
id: 039
feature: team-battle
type: brownfield
scope: complex
status: to-review
branch: main
created: 2026-11-10
---

# Feature: Team Battle ("Đấu đội")

## Overview

The Arena only has 1-on-1 duels. A group of friends or a class can't play together: only two people get a seat and everyone else can at most watch. The hub has shown a "Đấu đội" card marked "Sắp ra mắt" since feature 024. This feature makes it real.

A host creates a team room for 2 to 10 players, waits for them to join, and puts each player on Team A or Team B. A match is timed instead of having a fixed number of questions: the host picks 5, 10 or 15 minutes, and the faster the teams answer, the more questions they get through. Teams take turns, one question each, and inside a team the members take turns too. Each team has a shared pool of hints that grows with every correct answer.

## Goals

- [ ] A host and up to 9 friends on different devices can finish a team match from room creation to result without help
- [x] Every player in a team match sees the same question, turn, clock, score and hint count at the same time, and every screen shows the same result

## Out of Scope

| Feature | Reason |
|---------|--------|
| More than two teams | Owner chose Team A vs Team B (decisions.md) |
| Spectators in a team room | Up to 10 players already covers a group; later if asked |
| A team match changing the Arena record (wins, losses, best streak) | Owner chose history only (decisions.md) |
| Points, daily streak, leaderboard or Ôn tập changes | Same rule as 1-1 duels (feature 023) |
| Players choosing their own team | The host assigns teams |
| Challenging online friends into a team room from the friends list | Feature 035 covers 1-1 only; later |
| Chat inside the room | Same reason as feature 023: it lets players pass answers |
| Hints for "Nghe và chọn từ" | Owner: hints only for "Nhớ lại từ" and "Viết câu" |
| Guests | Signed-in only, like the 1-1 Arena |

## User Stories

### P1: Create a team room and fill it

- As a signed-in host, I want to create a team room with my settings and share it so that my friends can join
- **Why P1:** No team match can start without a room
- **Independent Test:** Create a room for 4, share the code, join from three other signed-in browsers, and see all four names in the lobby

**Acceptance Criteria:**

- [x] AC-001: WHEN anyone opens "Đấu trường" THEN the "Đấu đội" card SHALL be an active link to the team screen, no longer marked "Sắp ra mắt" (changes feature 024 AC-003)
- [x] AC-002: WHEN a signed-in learner opens the team screen THEN system SHALL let them choose the room size (2 to 10 players, host included), the mode ("Nghe", "Nhớ từ", "Viết câu", "Hỗn hợp"), the level (A1 to C1, their own level preselected, modes a level can't fill disabled), the match length per round (5, 10 or 15 phút), the time per question (15, 25, 30 or 45 giây, 15 preselected) and the rounds (1 hiệp, or 3 hiệp), then create the room with one "Tạo phòng" button
- [x] AC-003: WHEN a team room is created THEN system SHALL show its 6-character code, a copyable invite link and a QR code, as for a 1-1 room
- [x] AC-004: WHEN a signed-in learner enters the code of a team room (on the hub's "Vào phòng bằng mã" card) or opens its invite link THEN system SHALL put them in that team room and show every player's name and avatar to everyone in it
- [x] AC-005: WHEN the room already holds as many players as its size, or its match has started THEN system SHALL refuse to join and say why in Vietnamese
- [x] AC-006: WHEN a guest opens the team screen or a team invite link THEN system SHALL show the sign-in prompt, and after sign-in from an invite link SHALL continue into the room
- [x] AC-007: WHEN anyone is in the lobby THEN system SHALL show the room's settings line (e.g. "Hỗn hợp · A2 · 10 phút/hiệp · 15 giây/câu · 3 hiệp") and how many seats are filled (e.g. "4/6 người")

### P1: Host assigns teams

- As the host, I want to put each player on a team and set the turn order so that the teams are the way we want them
- **Why P1:** Turns can't run without teams
- **Independent Test:** With 5 players in the lobby, put 3 on Team A and 2 on Team B, reorder Team A, and see the same teams on every screen

**Acceptance Criteria:**

- [x] AC-008: WHEN players join THEN system SHALL list them as "Chưa xếp đội" (not on a team) until the host places them
- [x] AC-009: WHEN the host places a player on "Đội A" or "Đội B", moves them to the other team, or takes them off a team THEN system SHALL show the change to everyone in the room at once; the host places themselves the same way
- [x] AC-010: WHEN the host reorders the players of a team THEN that order SHALL be the team's turn order, shown with numbers on every screen
- [x] AC-011: WHEN the host offers "Chia ngẫu nhiên" (random split) THEN system SHALL put every player on a team at random, as evenly as the number of players allows
- [x] AC-012: WHEN teams have different sizes (e.g. 3 against 2) THEN system SHALL allow it
- [x] AC-013: WHEN a non-host player tries to change teams THEN system SHALL refuse it

### P1: Start the match

- As the host, I want to start the match when everyone is placed so that no one is left out
- **Why P1:** Opens the match

**Acceptance Criteria:**

- [x] AC-014: WHEN every player in the room is on a team and each team has at least one player THEN system SHALL enable "Bắt đầu" for the host; otherwise it SHALL stay disabled and say what is missing (e.g. "Còn 1 người chưa xếp đội", "Đội B chưa có ai")
- [x] AC-015: WHEN the room isn't full yet THEN the host SHALL still be able to start with the players present
- [x] AC-016: WHEN the host presses "Bắt đầu" THEN system SHALL lock the teams and settings and show a short countdown on every screen before the first question

### P1: Play a round in turns

- As a player, I want to answer my question when it's my turn while everyone watches so that the whole team plays together
- **Why P1:** This is the team match itself
- **Independent Test:** Play a 5-minute 1-round match with 3 vs 2 players and check turn order, clock, scoring and reveals on all screens

**Acceptance Criteria:**

- [x] AC-017: WHEN a round runs THEN system SHALL show a round clock counting down from the round's length (5, 10 or 15 phút) on every screen, next to both teams' scores and hint counts
- [x] AC-018: WHEN a round starts THEN Team A SHALL answer the first question, Team B the second, and so on, alternating; in round 2 Team B SHALL go first, and in round 3 Team A again
- [x] AC-019: WHEN it is a team's turn THEN the question SHALL go to that team's next player in turn order, wrapping to the first after the last, so a 2-player team's members answer more often than a 3-player team's
- [x] AC-020: WHEN a question opens THEN every screen SHALL show the question, whose turn it is ("Lượt của {tên} · Đội A") and the question timer counting down from the room's time per question
- [x] AC-021: WHEN it is a player's turn THEN only that player SHALL get an answer box; everyone else SHALL see the question and that the player is typing or got it wrong, never the text they type or pick
- [x] AC-022: WHEN the player answers THEN system SHALL grade it like the 1-1 Arena: one pick in "Nghe và chọn từ", retries on typed questions until right or out of time, and the same forgiving grading for "Viết câu"
- [x] AC-023: WHEN the player answers correctly THEN their team SHALL get 1 point
- [x] AC-024: WHEN the player answers wrong in "Nghe và chọn từ" or the question's time runs out THEN no team SHALL get a point, and the other team SHALL NOT get a chance at that question
- [x] AC-025: WHEN a question ends THEN every screen SHALL show the correct answer and whether it was right for about 2 seconds, then the next question SHALL open for the other team right away
- [x] AC-026: WHEN a question is on screen THEN system SHALL NOT have sent its answer to any browser
- [x] AC-027: WHEN the round clock reaches zero during a question THEN that question SHALL play out to its end
- [x] AC-028: WHEN the round clock has reached zero and Team A answered the round's last question THEN Team B SHALL get one more question so both teams answered the same number; then the round SHALL end
- [x] AC-029: WHEN a round ends THEN system SHALL show both teams' points, and the team with more points SHALL win the round

### P1: Team hints

- As a player, I want to spend one of my team's hints on a hard question so that I can still score
- **Why P1:** Hints are part of the rules the owner set and are what makes teammates' correct answers help each other
- **Independent Test:** Answer one question correctly, see the hint count go from 1 to 2, use a hint on a "Nhớ lại từ" question and see the word as "h****"

**Acceptance Criteria:**

- [x] AC-030: WHEN a round starts THEN each team SHALL have 1 hint, shown on every screen
- [x] AC-031: WHEN a player answers correctly (with or without a hint) THEN their team SHALL earn 1 more hint
- [x] AC-032: WHEN it is a player's turn on a "Nhớ lại từ" or "Viết câu" question and their team has at least 1 hint THEN system SHALL offer "Gợi ý" (hint) to that player; on "Nghe và chọn từ" or with 0 hints it SHALL not be offered
- [x] AC-033: WHEN the player uses "Gợi ý" on "Nhớ lại từ" THEN system SHALL show the word with only its first letter visible and the rest as one mark per letter (e.g. "happy" as "h****"), and the first tile SHALL show that letter
- [x] AC-034: WHEN the player uses "Gợi ý" on "Viết câu" THEN system SHALL show every word of the expected sentence with only its first letter visible (e.g. "I am happy" as "I a* h****")
- [x] AC-035: WHEN a hint is used THEN the team's hint count SHALL go down by 1 on every screen, the hint SHALL show on every screen, and the same question SHALL not take a second hint
- [x] AC-036: WHEN a hinted answer is correct THEN it SHALL score 1 point, the same as without a hint

### P1: Win the match

- As a player, I want a clear result so that we know which team won
- **Why P1:** Ends the match
- **Independent Test:** Play 3 hiệp and see it end at 2-0 without a third round

**Acceptance Criteria:**

- [x] AC-037: WHEN a round ends tied THEN system SHALL play sudden-death pairs: each team gets one more question (the team that did not answer last goes first); if one team is right and the other isn't, that team SHALL win the round; after 3 tied pairs the round SHALL be a draw
- [x] AC-038: WHEN a team wins the rounds needed (1 of 1, or 2 of 3) THEN system SHALL end the match and show the winning team, its players, and each round's points to everyone
- [x] AC-039: WHEN a 1-round match ends in a draw, or a 3-round match ends with neither team ahead in rounds won THEN system SHALL show "Hòa" (draw)
- [x] AC-040: WHEN a team match ends THEN system SHALL add it to each player's "Lịch sử đấu" with both teams' players, the round points and the result, and SHALL NOT change the Arena record (wins, losses, best streak), points, the daily streak, the leaderboard or Ôn tập
- [x] AC-041: WHEN a match ends THEN system SHALL show each player how many questions they answered and how many they got right

### P1: Disconnects

- As a player, I want the match to carry on when a teammate's connection drops so that nine people don't wait for one
- **Why P1:** With up to 10 devices, someone dropping is likely

**Acceptance Criteria:**

- [x] AC-042: WHEN a player disconnects during a match THEN the match SHALL keep running, their name SHALL show as offline, and their turns SHALL go to the next connected teammate in turn order
- [x] AC-043: WHEN a player disconnects while it is their turn THEN that question SHALL be given to the next connected teammate with its full time
- [x] AC-044: WHEN the player reconnects THEN system SHALL restore their view and put them back in their place in the turn order
- [x] AC-045: WHEN every player of a team has been disconnected for 30 seconds THEN system SHALL end the match and the other team SHALL win
- [x] AC-046: WHEN the host disconnects or leaves during a match THEN the match SHALL continue; WHEN the host leaves the lobby before the match starts THEN system SHALL close the room and tell everyone
- [x] AC-047: WHEN a non-host player leaves the lobby THEN system SHALL free their seat and take them off their team

### P2: Game guide

- As a player new to team matches, I want to read the rules so that I know how turns, the clock and hints work
- **Why P2:** Players can learn by playing; the guide helps the first time

**Acceptance Criteria:**

- [x] AC-048: WHEN the learner presses the help button on the team screen THEN system SHALL open a guide covering teams, turns, the round clock and the extra question at the end, hints, scoring, rounds and sudden death, and disconnects

### P2: Change settings before the match

- As the host, I want to change the settings in the lobby so that I don't have to make a new room

**Acceptance Criteria:**

- [x] AC-049: WHEN the room is in the lobby THEN the host SHALL be able to change mode, level, round length, time per question and rounds ("Đổi cài đặt"), and everyone else SHALL see "Chủ phòng đã đổi cài đặt: {cài đặt}"
- [x] AC-050: WHEN the host lowers the room size below the number of players present THEN system SHALL refuse it

### P3: Play again

- As a player, I want to play another match with the same people so that we don't have to make a new room

**Acceptance Criteria:**

- [x] AC-051: WHEN a match ends THEN system SHALL offer the host "Chơi lại" (play again), which returns everyone to the lobby with the same teams, order and settings, where the host can change them and start again with new questions

## Edge Cases

- WHEN a level has fewer usable questions of a mode than a 15-minute round could need THEN system SHALL reuse questions only after all have been asked in that match, and SHALL not offer a mode a level can't fill at all
- WHEN a player sends an answer when it isn't their turn, or after the question ended THEN system SHALL ignore it
- WHEN a player asks for a hint when it isn't their turn, the team has 0 hints, or the question already took one THEN system SHALL refuse it
- WHEN a player opens the same team room in a second tab THEN system SHALL keep only the newest connection and tell the old tab
- WHEN a team room stays in the lobby for 10 minutes without starting THEN system SHALL close it and its code SHALL stop working
- WHEN a learner is already in another Arena room THEN system SHALL treat joining a team room the same way the 1-1 Arena treats joining a second room
- WHEN a "Viết câu" sentence has several accepted wordings THEN the hint SHALL show the first letters of one of them, the same one on every screen
- WHEN a word contains a space, hyphen or apostrophe THEN the hint SHALL keep that character visible and mask only letters
- WHEN only one player is in the room THEN "Bắt đầu" SHALL stay disabled, since each team needs at least one player
- WHEN a player sends answers faster than a person could type THEN system SHALL limit them as in the 1-1 Arena
- WHEN the screen is 375 px wide THEN the lobby, team lists and match screen SHALL fit one column with no horizontal scroll

## Success Criteria

- [ ] A 3-round team match with 6 players on separate devices finishes with matching scores, hint counts and result on every screen in 5 out of 5 test runs
- [ ] A turn change (answer revealed, next question shown) reaches every screen within 1 second on a normal connection
- [x] Unit tests cover turn rotation with uneven teams and offline players, the end-of-clock extra question, hint earning and spending, hint masking, sudden-death pairs and draws
- [ ] Running team matches stays within the Cloudflare Workers free plan
- [ ] Lint, typecheck, unit tests and the Arena e2e tests pass

## Open Questions

- None blocking. Defaults chosen without the owner's input are in decisions.md under Tentative.

## Notes

- Decisions and their reasons: decisions.md
- Builds on feature 023 (rooms, grading, sudden death), 024 (hub cards), 025 (match history), 028 (time per question) and quick 059 (join by code on the hub).
- With 10 players and a 5-minute round, each player may answer only 2 or 3 questions. That is expected; the host picks the length.
- A 3-round match at 15 minutes a round can last 45 minutes or more.

## Baseline

### Current Behavior

- The hub shows "Đấu 1-1" and a dimmed "Đấu đội" card marked "Sắp ra mắt".
- A 1-1 room holds two players and up to three watchers. Both players race on the same 12 questions per round, and the first correct answer scores.
- The host sets mode, level, rounds and time per question; tied rounds go to sudden death.
- Finished duels appear in "Lịch sử đấu" and change the Arena record.

### Gaps / Limitations

- A group bigger than two can't play together.
- Every match has a fixed number of questions, so there is no way to play for a set time.
- There are no hints anywhere in the Arena.
