---
id: 024
feature: arena-modes
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-05
---

# Feature: Arena modes and the 1-1 screen

## Overview

The Arena hub (feature 023) shows two flat cards side by side: "Thách đấu một người bạn" with a button that opens a dialog, and "Vào phòng bằng mã". The owner finds it unengaging, and there is no room for the team matches planned later. The hub becomes a choice of modes: "Đấu 1-1" and "Đấu đội" (shown but not available yet). "Đấu 1-1" opens its own screen that sets up a duel in one panel: a VS header, the room settings inline, a big "Tạo phòng" button, and joining by code below it. (Since quick 059, joining by code sits on the hub instead.)

## Goals

- [ ] A learner gets from the hub to a created room in two screens and one click per setting, with no dialog
- [ ] The hub has a place for team matches without changing again when they arrive

## Out of Scope

| Feature | Reason |
|---------|--------|
| Team matches | Later feature; only the disabled card now |
| Changes to the room, lobby or duel screens | Feature 023 owns them; only the links back to the hub stay |
| A new palette or fonts | The app's tokens and fonts stay; the screen uses them |

## User Stories

### P1: Choose a mode

- As a learner, I want to see which kinds of match the Arena has so that I can pick one, and know team matches are coming
- **Why P1:** The hub is the Arena's entry point
- **Independent Test:** Open `/arena`: two cards, the 1-1 one opens `/arena/1v1`, the team one does nothing

**Acceptance Criteria:**

- [x] AC-001: WHEN anyone opens "Đấu trường" THEN system SHALL show two mode cards, "Đấu 1-1" and "Đấu đội", each with an icon and a short description
- [x] AC-002: WHEN the learner picks "Đấu 1-1" THEN system SHALL open `/arena/1v1`
- [x] AC-003: WHEN the learner looks at "Đấu đội" THEN system SHALL mark it "Sắp ra mắt" (coming soon), dimmed, not a link and not focusable, and screen readers SHALL hear that it isn't available yet

### P1: Set up a 1-1 duel on one screen

- As a learner, I want to choose the settings and create the room on the same screen so that starting a duel feels quick
- **Why P1:** Replaces the dialog and the two flat cards the owner asked to redesign
- **Independent Test:** On `/arena/1v1`, pick "Viết câu", B1 and 1 hiệp, press "Tạo phòng" and land in the room with those settings

**Acceptance Criteria:**

- [x] AC-004: WHEN a signed-in learner opens `/arena/1v1` THEN system SHALL show a VS header with their avatar and name against an empty "?" seat, the mode, level and rounds choices inline (their own level preselected, the modes a level can't fill disabled, as in feature 023 AC-002), and one full-width "Tạo phòng" button that creates the room and opens it
- [x] AC-005: WHEN the learner has a code THEN system SHALL let them join from the hub ("Đấu trường"), in a full-width "Vào phòng bằng mã" card between the mode cards and "Lịch sử đấu", with the code tiles and "Vào phòng" (feature 023 AC-005 messages unchanged); a guest goes straight to the room, which asks them to sign in. `/arena/1v1` no longer has the code entry (changed 2026-11-08 by quick 059; it used to sit below the settings)
- [x] AC-006: WHEN the learner has played before THEN system SHALL show their record (wins, losses, best streak) on the screen
- [x] AC-007: WHEN a guest opens `/arena/1v1` THEN system SHALL show the sign-in prompt used by other locked areas (feature 023 AC-006)
- [x] AC-008: WHEN the learner wants to go back THEN system SHALL offer a link to "Đấu trường"
- [x] AC-009: WHEN the learner hovers or focuses the help button in the top-right corner of the "Thách đấu 1-1" card THEN system SHALL show the tooltip "Cách chơi và cách giành chiến thắng?"; WHEN they press it THEN system SHALL open a dialog with the game guide: how a room starts, the 12 shared questions and the time per mode, how points, rounds, sudden death and the match are won, and what leaving or finishing a match does (feature 023 rules; added 2026-11-05 by quick 052)

## Edge Cases

- WHEN creating the room fails THEN system SHALL say why under the button and keep the chosen settings
- WHEN the level's content is still loading THEN system SHALL keep "Tạo phòng" disabled and say "Đang tải câu hỏi…"
- WHEN the screen is 375 px wide THEN system SHALL stack everything in one column with no horizontal scroll, and the mode choices SHALL stay at least 44 px tall
- WHEN the learner prefers reduced motion THEN system SHALL drop the VS header's glow animation and the press scale

## Success Criteria

- [ ] From the hub, a learner creates a room in at most 5 clicks with the default settings changed (1v1 card, mode, level, rounds, Tạo phòng)
- [ ] The hub and the 1-1 screen pass the `ui-ux-pro-max` pre-delivery checklist at 375, 768 and 1280 px in light and dark

## Open Questions

- None. The owner chose the one-panel layout (VS header, inline settings, join below) over tabs or two big tiles.

## Notes

- Changes feature 023 AC-001 (the hub now offers modes; create and join moved to `/arena/1v1`). 023's other ACs are unchanged.
- Design direction (from `ui-ux-pro-max`): keep the app's tokens; layered cards with a soft primary glow, scale 0.97 on press, 150 to 300 ms transitions, visible focus rings, no emoji icons.
- The links back to the hub ("Về Đấu trường", "Rời phòng") stay on `/arena`.

## Baseline

### Current Behavior

- `/arena` shows, behind the sign-in gate, a card with "Tạo phòng" (opens the "Tạo phòng đấu" dialog) next to a card with the code entry, then the record line.

### Gaps / Limitations

- No mode choice, so team matches have nowhere to go.
- Creating a room takes a dialog; the page itself is two plain cards.
