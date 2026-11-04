---
id: 023
feature: arena
created: 2026-11-04
---

# Decisions: Arena (1-on-1 duels)

Decisions on gray areas resolved with the owner on 2026-11-04.

## Resolved

### Who can play

- **Question:** Can guests create or join rooms?
- **Decision:** Signed-in learners only. Guests see the usual sign-in prompt.
- **Rationale:** Gives each player a stable name and avatar and makes abuse controllable.
- **Caveats:** An invite link opened by a guest should continue into the room after sign-in.

### What "Competition Mode" means

- **Question:** What does the creator choose as the mode?
- **Decision:** The question type mix: "Nghe", "Nhớ từ", "Viết câu" or "Hỗn hợp". Difficulty (the CEFR level) is a separate setting.
- **Rationale:** Matches the three timed question types the owner described.

### How answers are seen

- **Question:** Shared chat or private answer boxes?
- **Decision:** Each player has a private box. The opponent sees only that they are typing or got it wrong, never the text.
- **Rationale:** A shared chat lets a player copy or rule out the opponent's guesses.

### Tries per question

- **Question:** How many tries does a player get?
- **Decision:** One try on multiple choice ("Nghe và chọn từ"); unlimited retries on typed questions until someone is right or time runs out.
- **Rationale:** Unlimited tries on multiple choice means clicking every option.

### "Viết câu" task and grading

- **Question:** What is the 30-second writing task, and how is it graded without AI?
- **Decision:** Read the Vietnamese and type the English, graded like "Dịch câu" (feature 016): accepted word orders and approved wordings, forgiving case, punctuation, spacing and contractions.
- **Rationale:** Reuses grading learners already know; only sentences that can be translated are used.
- **Caveats:** Strict matching may feel harsh in a race. Claims ("my answer is also right") are not offered mid-duel.

### Tied rounds

- **Question:** What happens when a round ends level?
- **Decision:** Sudden-death questions, first correct answer wins, up to 3.
- **Rationale:** Easy to explain and keeps every round decisive.
- **Caveats:** Behaviour if all 3 sudden-death questions go unanswered is not yet decided; see Tentative.

### Rewards

- **Question:** Does a duel give anything outside the Arena?
- **Decision:** No points, no daily streak, no leaderboard and no Ôn tập changes.
- **Rationale:** A second account must not be usable to farm points.
- **Caveats:** Win and loss stats are kept and shown on Hồ sơ (owner, 2026-11-04). They are only stats: no points come from them.

### Menu place

- **Question:** Where does the Arena live?
- **Decision:** "Đấu trường" in the sidebar and the phone menu, locked for guests.
- **Rationale:** Owner's choice (2026-11-04).

### Ready window

- **Question:** When does the 30-second Ready window open?
- **Decision:** As soon as the second player joins. If it ends without both ready, the creator presses "Bắt đầu" to open a new one.
- **Rationale:** One less tap in the common case.

### Disconnects

- **Question:** What happens when a player drops mid-match?
- **Decision:** Pause for up to 30 s. Back in time: the interrupted question restarts. Otherwise the player who stayed wins.
- **Rationale:** A short drop shouldn't cost a match, and quitting can't dodge a loss.

### Round counts

- **Question:** Which round counts can the creator pick?
- **Decision:** 1 round, or best of 3 (ends at 2-0).
- **Rationale:** Two rounds can end 1-1.

### v1 extras

- **Question:** Which extra ideas ship in v1?
- **Decision:** Invite link with QR code, and rematch. Not in v1: the match review screen and "Thêm từ sai vào Ôn tập".

## Tentative

Defaults chosen by the agent without asking; revisit if the owner disagrees.

### Room code and lifetime

- **Tentative Decision:** 6 characters without similar-looking characters (no 0/O, 1/I/L); a room closes after 10 minutes without starting.
- **Revisit when:** Codes collide in practice, or friends need longer to join.

### Unresolved sudden death

- **Tentative Decision:** If 3 sudden-death questions all go unanswered, the player who took less time in total on the questions they won that round wins it. If that is equal too (for example 0-0 with no answers), the room's seed picks one.
- **Revisit when:** The owner prefers a draw or another rule.

### Answer reveal time

- **Tentative Decision:** About 3 seconds between a question's end and the next question.
- **Revisit when:** Playtests show it is too short to read a sentence answer.

### Question pool

- **Tentative Decision:** The room's level as a whole (not either player's own words), and only items with audio for "Nghe".
- **Revisit when:** Players want topic choice, or levels run short of items.

### Lobby disconnects

- **Tentative Decision:** A player whose socket drops before the match starts gets the same 30 s to come back before counting as having left (AC-010).
- **Revisit when:** Rooms linger with absent players, or the owner wants leaving to be immediate.

### Ready can be taken back, and an abandoned room closes fast

- **Tentative Decision:** Pressing "Sẵn sàng" again takes it back until both are ready. A room whose creator never connects (or drops and doesn't return within 30 s) closes then, instead of waiting out the 10-minute idle limit.
- **Revisit when:** Players press Ready by accident and want it locked, or a creator needs longer to come back.

