---
id: 025
feature: arena-match-history
created: 2026-11-05
---

# Decisions: Arena match history

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Where the history lives

- **Question:** A button that opens a side panel, a list right on the Arena home, or a card that opens its own page?
- **Decision:** A "Lịch sử đấu" card on the Arena home (record and last match) that opens a separate history page with the full list.
- **Rationale:** The hub stays short. A page has room for the list and the match details, has its own address, and works well on phones.
- **Caveats:** The new page goes through the new-page design step before it is built.

### How much detail each match keeps

- **Question:** Only a one-line summary, or the points of each round too?
- **Decision:** The summary (result, rounds score, opponent, date and time, mode and level, forfeit), plus the points of each round when a match is opened.
- **Rationale:** The room already knows each round's points when the match ends, so keeping them is cheap. They show how close a match was.

### How many matches to keep

- **Question:** Keep 50, 100, or every match?
- **Decision:** The 50 newest per learner. Older ones are dropped when a new one is saved.
- **Rationale:** Keeps the list short and the database small on the free plan. The win and loss totals still count every match.

## Tentative

### What the opponent's entry shows after they delete their account

- **Question:** When the opponent deletes their account, should the match disappear from the other learner's history, or stay without the opponent's details?
- **Tentative Decision:** Keep the match and show "Người chơi đã xóa tài khoản" without a name or picture.
- **Revisit when:** The privacy note or a learner asks for matches to be removed for both sides.
