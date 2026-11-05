---
id: 025
feature: arena-match-history
type: brownfield
scope: large
status: done
branch: main
created: 2026-11-05
---

# Feature: Arena match history

## Overview

After an Arena match, the only thing that stays with the learner is a running total of wins and losses. Once the room closes, the score, the opponent and the time are gone. Learners can't look back at who they played, how close a match was, or how they did against a given friend. This feature keeps a record of each finished match and adds a "Lịch sử đấu" card on the Arena home that opens a page listing the learner's recent matches.

## Goals

- [x] A signed-in learner can see every one of their last 50 finished matches, each with result, score, opponent and date and time, within two taps from the Arena home
- [x] Every match that ends with a winner from now on shows up in both players' history, with nothing missing and nothing counted twice

## Out of Scope

| Feature | Reason |
|---------|--------|
| Matches played before this feature ships | Only win and loss totals were kept; there is nothing to rebuild them from |
| Team matches | Team mode isn't open yet; its history comes with it |
| Seeing another learner's history | The history is private to its owner |
| The questions and answers of each round | Only scores are kept; a replay is a separate feature |
| Head-to-head totals per opponent, filters and search | Can follow once the plain list exists |
| Deleting single matches from the history | Deleting the account removes everything; no need seen yet |
| Guests (not signed in) | Arena already needs an account |

## User Stories

### P1: See my recent matches

- As a signed-in learner, I want to open a list of my past Arena matches so that I can see who I played, whether I won, the score and when
- **Why P1:** This is the request itself; without it the feature does nothing
- **Independent Test:** Play a best-of-3 match on the local preview with two accounts, open Đấu trường → Lịch sử đấu with each account, and see the same match from both sides (one "Thắng 2–1", the other "Thua 1–2") with the opponent's name and picture and the time it ended

**Acceptance Criteria:**

- [x] AC-001: WHEN a match ends with a winner (by score or by forfeit) THEN system SHALL save it once for each of the two players, with the time it ended, both players' name and picture as they were in the match, the rounds each won, the points of each round, who won, whether it ended by forfeit, and the mode, level and number of rounds
- [x] AC-002: WHEN a lobby is cancelled or a room closes before a match ends THEN system SHALL save nothing to the history
- [x] AC-003: WHEN a signed-in learner opens the history page THEN system SHALL list their matches newest first, each showing the result ("Thắng" or "Thua"), the score in rounds from their side (e.g. 2–1), the opponent's name and picture, the date and time in the learner's own time zone, and the mode and level
- [x] AC-004: WHEN a match in the list ended by forfeit THEN system SHALL say so next to the result ("Đối thủ rời trận" when the learner won, "Bạn rời trận" when they lost, the words the results screen already uses)
- [x] AC-005: WHEN a learner has more than 50 saved matches THEN system SHALL keep only their 50 newest and drop the older ones, while the win and loss totals still count every match
- [x] AC-006: WHEN a signed-in learner has no saved matches THEN system SHALL show a friendly empty state with a link to start a 1-1 match
- [x] AC-007: WHEN a guest opens the history page THEN system SHALL ask them to sign in, the same way the 1-1 screen does
- [x] AC-008: WHEN the history can't be loaded THEN system SHALL show a Vietnamese error with "Thử lại", and keep the rest of the page usable

### P1: Find the history from the Arena home

- As a signed-in learner, I want a card on the Arena home that shows my record and my last match so that I can tell how I'm doing at a glance and get to the full list
- **Why P1:** Without an entry point the history page can't be found; the card is what was asked for on the Arena home
- **Independent Test:** On Đấu trường, the "Lịch sử đấu" card shows the win and loss totals and the last match; activating it opens the history page

**Acceptance Criteria:**

- [x] AC-009: WHEN a signed-in learner opens the Arena home THEN system SHALL show a "Lịch sử đấu" card below the mode cards with their wins and losses and their latest match (result, score, opponent, and when, e.g. "20:14 hôm qua")
- [x] AC-010: WHEN a learner activates the card, by pointer, touch or keyboard THEN system SHALL open the history page
- [x] AC-011: WHEN the learner is a guest THEN system SHALL show the card with a short invitation to sign in to keep a match history, and activating it SHALL lead to the sign-in prompt
- [x] AC-012: WHEN the signed-in learner has no matches yet THEN system SHALL show the card with a line inviting them to play their first match
- [x] AC-013: WHEN the history page is open THEN system SHALL offer a way back to the Arena home

### P2: See the rounds of one match

- As a learner, I want to open one match and see the points of each round so that I can tell how close it was
- **Why P2:** It adds depth, but the summary already answers who, when and who won

**Acceptance Criteria:**

- [x] AC-014: WHEN a learner opens a match in the list THEN system SHALL show each round's points for both players (e.g. Hiệp 1: 5–3, Hiệp 2: 2–5, Hiệp 3: 5–4), mark who won each round, and note a round decided by sudden death or, when the points were level, by answer time
- [x] AC-015: WHEN a match ended by forfeit before a round finished THEN system SHALL show the rounds that finished and say the match ended by forfeit
- [x] AC-016: WHEN the match details are closed THEN system SHALL return the learner to the same place in the list

## Edge Cases

- WHEN the two players rematch in the same room THEN system SHALL save each match as its own entry
- WHEN saving the history fails at the end of a match THEN system SHALL still end the match normally for both players (the totals are saved on their own, as today)
- WHEN the opponent has since deleted their account THEN system SHALL keep the match in the learner's list but show the opponent as "Người chơi đã xóa tài khoản" without a picture
- WHEN a learner deletes their account THEN system SHALL delete their own history with it
- WHEN the opponent changes their name or picture later THEN system SHALL keep showing the name and picture from the time of the match
- WHEN two matches end in the same second THEN system SHALL still list both, in a stable order
- WHEN the learner's list is long on a 320 px wide phone THEN system SHALL show each match without sideways scrolling and keep the opponent's name readable (shortened with an ellipsis if needed)
- WHEN someone requests another learner's history THEN system SHALL return only the signed-in learner's own matches

## Success Criteria

- [x] On the local preview, 3 matches played between two accounts (one won by forfeit) show up as 3 entries in each account's history, with matching scores from both sides
- [x] A learner with 55 saved matches sees exactly the 50 newest
- [x] The history page and the card pass an accessibility check (keyboard reachable, labelled, sufficient contrast) in light and dark themes, and fit a 320 px wide screen
- [x] Loading the history page stays within the free plan's limits per request (no more than one database round trip)

## Open Questions

- None

## Notes

- Decisions on placement, detail and retention are in `decisions.md`.
- The privacy note shown at sign-in says what the app stores. It will need a line saying the Arena keeps your last 50 matches, including your opponent's name and picture.
- The win and loss totals shown on the 1-1 screen stay as they are and keep counting every match.

## Baseline

### Current Behavior

- When a match ends, each player's win and loss totals and win streak are updated; nothing else about the match is kept.
- The 1-1 screen shows the learner's record in one line ("12 thắng · 5 thua · Chuỗi thắng dài nhất 4").
- The Arena home shows two cards: "Đấu 1-1" and "Đấu đội" (coming soon).
- A match always ends with a winner: by rounds won, after a sudden-death round, or by forfeit. A lobby can be cancelled before any match starts.

### Gaps / Limitations

- A learner can't see who they played, the score, or when, once the results screen is closed.
- The Arena home doesn't show the learner's record at all.
