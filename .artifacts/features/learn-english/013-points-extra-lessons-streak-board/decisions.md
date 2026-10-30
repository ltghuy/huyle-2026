---
id: "013"
feature: points-extra-lessons-streak-board
created: 2026-10-30
---

# Decisions: Spend points on extra lessons, rank the board by streak

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### What an extra lesson contains

- **Question:** After the daily lesson, does a paid session teach new words, only practice old ones, or unlock the exercise library?
- **Decision:** Another lesson built like the daily one: due reviews, the next new words, grammar when scheduled, sentences and writing.
- **Rationale:** Owner choice (2026-10-30). Paying for something that is free today (review, the library) would feel like a loss; new words are what the learner can't get more of today.
- **Caveats:** Learners move through the course faster, so the review load the next days grows with each extra lesson.

### Points from extra lessons

- **Question:** Does finishing a paid extra lesson earn points back?
- **Decision:** No. Only the daily lesson earns points.
- **Rationale:** Owner choice (2026-10-30). With a refund the balance could grow from extra lessons alone, and the rising price would mean little.

### What the board ranks by

- **Question:** Current streak on one board, current streak on the weekly board, or longest streak ever?
- **Decision:** One board with no weekly reset, ranked by current streak. Ties go to more points ever earned, then to whoever reached the streak first.
- **Rationale:** Owner choice (2026-10-30). A weekly board ranked by streak would mostly show streaks that started before Monday, and the longest-ever streak never drops, so it stops rewarding daily practice.

## Tentative

Decisions marked as tentative: revisit if assumptions change.

### Price rounding

- **Question:** How is "30% more each time" rounded?
- **Tentative Decision:** The nth extra lesson of the day costs 10 × 1.3^(n−1) rounded to the nearest whole point: 10, 13, 17, 22, 29, 37, 48.
- **Revisit when:** The owner wants a different rounding or a price cap.

### When points are taken

- **Question:** Are points taken when the extra lesson starts or when it ends?
- **Tentative Decision:** When it starts, after a confirmation. Leaving and coming back the same day doesn't charge again; an unfinished extra lesson is dropped at midnight with no refund.
- **Revisit when:** Learners complain about losing points to an unfinished lesson.

### Balance shown

- **Question:** Which number is "points" once they can be spent?
- **Tentative Decision:** Home and profile show the points the learner has now. The profile also shows the total ever earned, which the board uses for ties.
- **Revisit when:** The owner wants the board to show points too.

### Broken streaks on the board

- **Question:** What happens on the board when a learner misses a day?
- **Tentative Decision:** They drop off until their next daily lesson, judged by the date of their last daily lesson against today and yesterday.
- **Revisit when:** The board looks empty, or the owner prefers showing broken streaks at the bottom.

### Release-day points

- **Question:** Do past days get topped up to 20?
- **Tentative Decision:** No. Past days keep the 10 they earned; days from release on earn 20.
- **Revisit when:** The owner wants to reward existing learners.
