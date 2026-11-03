---
id: 020
feature: lua-companion-fresh-pages
type: brownfield
scope: large
status: done
branch: main
created: 2026-11-03
---

# Feature: Lửa, a companion character, and a fresh look for the study pages

## Overview

The home and profile pages got a landing-style look (feature 019), but the study pages (Từ vựng, Ngữ pháp, Động từ bất quy tắc, Ôn tập, Từ khó) still open with a plain title over dense lists, and their empty states are a grey icon in a dashed box. The owner wants these pages more modern, fresh and youthful, and a character who keeps the learner company. The character is **Lửa**, a small friendly flame: it is the streak, so it fits the name Streak Daily, and it shows a mood (happy, cheering, thinking, sleepy) that matches the moment. Layouts, filters and behavior stay the same.

## Goals

- [x] All five study pages share the home page's look, with Lửa in their header
- [x] Every empty or error state on those pages has Lửa with a mood that fits, instead of a grey icon
- [x] Levels read at a glance through one colour per level, the same on every page

## Out of Scope

| Feature | Reason |
|---------|--------|
| New layouts (review dashboard, grammar path, verb cards) | The owner chose a fresh look with the same layouts |
| Animated or talking character, sounds | Keep it light; a gentle idle motion only |
| Lửa inside the lesson and exercise screens | Those are focus screens; can come later |
| Copying another app's mascot | Lửa is an original drawing; no fox (the reference site's) and no owl (Duolingo's) |

## User Stories

### P1: A companion and a fresh header on every study page

- As a learner, I want the study pages to feel friendly and alike so that the app is pleasant to come back to
- **Why P1:** the owner's main ask
- **Independent Test:** open each of the five pages: each has the compact hero with Lửa, and its content works as before

**Acceptance Criteria:**

- [x] AC-001: WHEN the app shows Lửa THEN system SHALL draw it as an original inline SVG flame with a face, in its own warm palette (coral tip, amber flame, cream core), the same in light and dark, in four moods (happy, cheer, think, sleepy), decorative to screen readers unless it carries a label, with a gentle idle sway only under `prefers-reduced-motion: no-preference`
- [x] AC-002: WHEN a learner opens `/vocabulary`, `/grammar`, `/irregular-verbs`, `/review` or `/hard-words` THEN system SHALL show a compact hero (glow, pill, `h1` with the page's name in plain text since only the home wordmark is a gradient, one line of text) with Lửa beside it, in place of the plain title; the page's content, filters and links behave as before
- [x] AC-003: WHEN one of these pages has nothing to show (nothing due, no hard words, no match for the filters, no content yet) or fails to load THEN system SHALL show Lửa with a fitting mood (cheer when there is nothing left to do, think for no match or no content, sleepy for a load error) in place of the grey icon, keeping the text and buttons

### P2: Level colours and Lửa on the home page

- As a learner, I want each level to have its own colour and to see Lửa on the home page so that the app feels like one place

**Acceptance Criteria:**

- [x] AC-004: WHEN a level (A1, A2, B1, B2, C1) is shown as a badge or heading on these pages THEN system SHALL colour it with that level's theme token (one hue per level, readable in light and dark)
- [x] AC-005: WHEN the home page shows the streak THEN system SHALL show Lửa next to it: sleepy before today's lesson is done, happy after, cheering on a streak of 7 days or more

## Edge Cases

- WHEN the learner has turned motion off THEN system SHALL show Lửa still
- WHEN the screen is 360 px wide THEN system SHALL keep Lửa small beside the title (or above it) with no horizontal scroll
- WHEN the learner picks another accent colour or theme THEN system SHALL keep Lửa looking the same, since it has its own palette

## Success Criteria

- [x] Each of the five pages shows Lửa and the new header in light and dark mode at 1440 px and 390 px
- [x] Lint, typecheck, tests and build pass; the pages stay static shells

## Open Questions

- None

## Notes

Requested on 2026-11-03 after feature 019. The owner picked Lửa (over a sprout and a word bubble) and "fresh look, same layout". Lửa was replaced the same day by the owner's graduate owl (feature 021); the placements from this feature stay.

## Baseline

### Current Behavior

- Each page opens with the shared plain title (`PageHeader`); empty states show a grey Lucide icon in a dashed box; levels are plain text or neutral badges

### Gaps / Limitations

- The study pages look older than home and profile, and nothing gives the app a personality

## Verification

- 2026-11-03: `pnpm lint`, `pnpm typecheck`, `pnpm test` (899 passed, 4 new in `src/components/mascot/lua.test.tsx`) and `pnpm build` pass; the five pages stay static (`○`).
- Browser, dark at 1568 px: each page shows the compact hero with Lửa (Từ vựng happy, Ngữ pháp think, Động từ bất quy tắc cheer, Ôn tập cheer, Từ khó think); Từ khó's empty state has a cheering Lửa; levels are coloured badges in Ngữ pháp, Từ vựng and the verb table; the home streak card shows a sleepy Lửa before today's lesson.
- At 390 px (iframe), light and dark: no horizontal scroll on any of the five pages or home; Lửa looks the same in both themes.
