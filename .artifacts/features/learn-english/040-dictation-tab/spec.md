---
id: 040
feature: dictation-tab
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-12
---

# Feature: "Nghe chép" tab with topic practice

## Overview

"Nghe chép" (listen to a sentence, then type it) is one button on the "Chủ đề khác" card at the end of "Từ vựng", over every sentence of the level (1220 at A1). Picking "Nghe chép" in the type filter leaves that single card, so a learner can't practise dictation about one subject. The owner wants dictation in its own tab, right of "Viết câu", with sets by level and topic, the way "Viết câu" groups "Dịch câu" (feature 018).

## Goals

- [x] A learner can pick a level and a topic in "Nghe chép" and do 10 dictation steps from that topic
- [x] "Từ vựng" no longer offers dictation; its other sentence types stay

## Out of Scope

| Feature | Reason |
|---------|--------|
| A topic field on sentence content | The word's topic is enough, as in feature 018; no content change or re-review |
| Other exercise types in "Nghe chép" | The tab is for dictation only, like "Viết câu" is for "Dịch câu" |
| Sentences without audio | Dictation needs a clip; those sentences are already left out today |

## User Stories

### P1: Dictation by topic

- As a learner, I want to do dictation on sentences about one subject at my level so that I train my ear on that subject's words
- **Why P1:** it is the request
- **Independent Test:** open "Nghe chép", pick A1 and a topic, start it, see up to 10 dictation steps from sentences of that topic

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens the exercise library THEN system SHALL show a fourth tab "Nghe chép", right of "Viết câu", with its set count, reachable at `?tab=dictation`
- [x] AC-002: WHEN "Nghe chép" is shown for a level THEN system SHALL show one card per topic over the sentences that can make a dictation step, where a sentence's topic is found the same way as in "Viết câu" (its own topic, else the first of its words that has one), then a "Chủ đề khác" card for the sentences with no topic; each card has one "Nghe chép" button (its run is titled "Nghe chép: <topic>") and the tab offers the level tabs and the topic filter but no type filter
- [x] AC-003: WHEN a learner starts a topic's dictation THEN system SHALL run up to 10 dictation steps, one per sentence of that topic in random order, and "Làm lại" SHALL draw a new round from the same topic
- [x] AC-004: WHEN "Từ vựng" is shown THEN system SHALL leave dictation out of its "Chủ đề khác" card and its type filter; the card keeps the four word types and word order, gap, choose the sentence and find the error

### P2: Old links

- As a learner with a bookmark or a home page link to dictation, I want it to land on dictation so that it still works
- **Why P2:** the home page "Nghe chép" area links to `?type=dictation`

**Acceptance Criteria:**

- [x] AC-005: WHEN a learner follows `?type=dictation` or `?id=dictation.<level>.<topic>` with no `?tab` THEN system SHALL open the "Nghe chép" tab (and that set when it exists); the home page "Nghe chép" area SHALL link to `?tab=dictation`

## Edge Cases

- WHEN a topic has fewer than 10 sentences with audio THEN system SHALL run one step per sentence
- WHEN a level has no sentence that can make a dictation step THEN system SHALL show the existing empty state in "Nghe chép"
- WHEN the four tabs share a 320 px phone THEN system SHALL fit them in one row without horizontal scroll, as the three tabs do today (quick 050); when the tab row is narrower than about 448 px the set counts beside the tab names are left out, and below about 640 px the icons too (quick 069 made this follow the row width rather than the screen, since the sidebar takes part of a wide screen)
- WHEN a learner switches from "Viết câu" to "Nghe chép" THEN system SHALL keep the chosen topic, since both tabs use the same topics

## Success Criteria

- [x] At A1, "Nghe chép" lists more than 10 topic cards and each run has 10 steps
- [x] The library tests and the quality gates (`pnpm typecheck && pnpm lint && pnpm build`) pass

## Open Questions

- None

## Notes

Requested by the owner on 2026-11-12 with screenshots of "Từ vựng" filtered to "Nghe chép" (one "Chủ đề khác · 1164 từ · 1220 câu" card) and unfiltered. Guests see the tab like the others; starting a set asks them to sign in, as everywhere in the library (feature 022).

## Baseline

### Current Behavior

- "Từ vựng" ends with a "Chủ đề khác" card holding the word types over the words of the level's sentences and five sentence types, dictation among them, each over every sentence of the level
- The "Từ vựng" type filter lists "Nghe chép"; choosing it shows only that card

### Gaps / Limitations

- Dictation can't be practised by subject, and it is hidden behind a filter in a tab named for vocabulary

## Verification

- 2026-11-12: `pnpm --filter learn-english typecheck`, `lint` and `build` pass. `pnpm --filter learn-english test`: 1591 tests, all pass after the home page test was updated for the new `?tab=dictation` link; the `sync-client` keepalive test failed once in the full run and passed 3 of 3 reruns (the timing flake noted in feature 018). `src/components/library/exercise-library.test.tsx` covers AC-001 to AC-005.
- In the browser at A1 (guest): the tabs read Từ vựng 112, Ngữ pháp 14, Viết câu 27, Nghe chép 27. "Nghe chép" lists 27 topic cards from "Con người & gia đình · 58 câu" to "Chủ đề khác", each with one "Nghe chép" button, and shows the topic filter without the type filter. "Từ vựng" → "Chủ đề khác · 1164 từ · 1220 câu" has 8 buttons and no "Nghe chép". At 320 px the four tabs end at 301 px with no horizontal scroll; at 480 px they show their counts and end at 461 px.

## Audit

- 2026-11-12: Goal 1 holds (27 topic cards at A1; AC-003 test runs 10 distinct dictation steps and a new round on "Làm lại"). Goal 2 holds (no dictation in "Từ vựng", its other seven types remain). Success criteria: more than 10 topics at A1 (27), gates pass.
