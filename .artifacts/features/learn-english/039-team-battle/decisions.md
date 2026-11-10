---
id: 039
feature: team-battle
created: 2026-11-10
---

# Decisions: Team Battle ("Đấu đội")

The owner described the mode on 2026-11-10 and answered the gray areas below the same day.

## Resolved

### Owner's rules (from the brief)

- **Question:** What is a team match?
- **Decision:** A host creates a room for up to 10 players and sets the size. Once players have joined, the host assigns teams; teams can be uneven. The host picks a match length of 5, 10 or 15 minutes instead of a question count, and the time per question as in 1-1. Teams alternate questions (A, B, A, …), members of a team take turns, and the next question opens right after the previous answer is revealed, right or wrong. Each team starts with 1 hint and earns 1 more per correct answer; any member can use one. Hints exist only for "Nhớ lại từ" and "Viết câu" and show the first letter with the rest masked ("happy" as "h****"). The match is 1 round or best of 3, won on team points.
- **Rationale:** Owner's brief.

### Who answers

- **Question:** On a player's turn, can teammates or the other team answer?
- **Decision:** Only the player whose turn it is. Everyone else watches the question and sees that the player is typing or got it wrong. No steal for the other team.
- **Rationale:** Matches "members take turns" and keeps scoring simple.

### Round length in best of 3

- **Question:** Is the chosen length for the whole match or for each round?
- **Decision:** Each round lasts the chosen length. The first team to win 2 rounds wins.
- **Caveats:** A 3 x 15-minute match is long; the host decides.

### End of the clock

- **Question:** Time running out can leave Team A one question ahead.
- **Decision:** A question in progress when the clock hits zero plays out. If Team A answered the last one, Team B gets one more so both teams answered the same number.
- **Rationale:** Fair to both teams; Team A always starting would otherwise favour it.

### Tied rounds

- **Question:** What happens when a round ends level?
- **Decision:** Sudden-death pairs, one question per team. One right and the other not wins the round. After 3 tied pairs the round is a draw.
- **Caveats:** A draw is possible, unlike 1-1 duels (feature 025 notes say a 1-1 match always has a winner).

### How a hint works

- **Question:** How many hints per question, what does "Viết câu" reveal, and does a hint cost anything?
- **Decision:** At most one hint per question. "Nhớ lại từ" shows the first letter ("h****"); "Viết câu" shows the first letter of every word ("I a* h****"). A hinted correct answer still scores 1 point and earns a hint.

### Teams and the host

- **Question:** How many teams, and does the host play?
- **Decision:** Always two teams, Team A and Team B. The host plays and is placed on a team like everyone else. Room size is 2 to 10 including the host; each team needs at least one player.

### Disconnects

- **Question:** Pause like 1-1, or keep going?
- **Decision:** Keep going. A disconnected player's turns pass to the next connected teammate, and they rejoin the rotation when back. If a whole team is gone for 30 seconds, the other team wins.
- **Rationale:** With 10 players, pausing for each drop would stall the match.

### Arena record

- **Question:** Does a team match change wins, losses and best streak?
- **Decision:** No. Team matches appear in "Lịch sử đấu" only.
- **Rationale:** The record stays a 1-1 measure.

## Tentative

Defaults chosen while writing the spec; the owner hasn't weighed in on them.

### Starting the match

- **Tentative Decision:** No Ready window. The host presses "Bắt đầu" once every player present is on a team, even if the room isn't full.
- **Revisit when:** Players complain about being started before they were looking.

### Hints across rounds

- **Tentative Decision:** Each round starts both teams at 1 hint again; unused hints don't carry over. No upper limit within a round.
- **Revisit when:** A strong team piles up hints and the other team finds it unfair.

### Who goes first

- **Tentative Decision:** Team A starts round 1 and round 3, Team B starts round 2. In sudden death, the team that didn't answer last goes first.
- **Revisit when:** Owner wants a coin toss.

### Reveal time

- **Tentative Decision:** The correct answer shows for about 2 seconds, shorter than 1-1, because the brief asks for the next question right away and the clock is running.
- **Revisit when:** Players say they can't read the answer in time.

### Settings options

- **Tentative Decision:** Same modes, levels and time-per-question options as 1-1 (15, 25, 30, 45 giây). A "Chia ngẫu nhiên" button helps the host split teams.
- **Revisit when:** Owner wants different options for teams.

### No spectators

- **Tentative Decision:** Team rooms have no watcher seats.
- **Revisit when:** Owner wants teachers or friends to watch a class match.
