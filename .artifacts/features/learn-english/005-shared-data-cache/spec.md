---
id: 005
feature: shared-data-cache
type: brownfield
scope: medium
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Feature: Shared in-memory data cache

## Overview

Course content (words, sentences, grammar, writing tasks) and the learner's own
progress are stored in the browser, and content is downloaded again only when
the owner publishes a new version. Within one visit, though, nothing is shared
in memory: every screen, and every part of a screen, reads the same content back
from browser storage and rebuilds its lookups on its own. The vocabulary screen
reads up to 2,775 words and 5,578 sentences per level, and the list and the
search box each do it separately. Moving between screens repeats the whole read,
so learners see a loading state every time they come back to a screen they
already opened, and two parts of a screen that need the same content at the
same moment both fetch it.

This feature keeps what was loaded in memory for the visit, shares it between
screens and components, and still picks up new content and changes made in
other tabs.

## Goals

- [x] Coming back to a screen opened earlier in the same visit shows its content straight away, without a loading state
- [x] Content needed by several parts of the app at once is read or downloaded once, not once per part
- [x] New content and progress changes still appear as they do today (new publish on window focus, changes from other tabs)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing how content is stored for offline use | The browser copy and its version check stay as they are; this only adds a layer in memory |
| Keeping the in-memory copy across page reloads | The browser copy already covers reloads |
| Server-side caching of the content API | Already cached at the edge; separate concern |
| Changing what any screen shows | Same screens, states and messages |

## User Stories

### P1: Screens I already opened come back at once

- As a learner, I want a screen I opened earlier in this visit to show its content immediately so that moving around the app feels quick
- **Why P1:** The main visible gain; today every screen change repeats the full read
- **Independent Test:** Open Từ vựng, go to Hôm nay, go back to Từ vựng: the word list is there with no loading skeleton

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner returns to a screen whose content was loaded earlier in the same visit THEN system SHALL show that content without a loading state and without reading it from browser storage again
- [x] AC-002: WHEN two parts of the app need the same content or the same progress data at the same time THEN system SHALL read or download it once and give both the same result
- [x] AC-003: WHEN content for a level was loaded for one screen THEN system SHALL reuse it on any other screen that needs that level (for example the vocabulary list and the word search)

### P1: Updates still arrive

- As a learner, I want new lessons and my changes from other tabs to show up as before so that the cache never shows me old data
- **Why P1:** A faster app that shows stale progress would be a regression
- **Independent Test:** Answer a review in one tab: the due count drops in a second tab. Publish new content, refocus the window: the new content shows

**Acceptance Criteria:**

- [x] AC-004: WHEN the window regains focus and a new content version was published THEN system SHALL reload the content on screen and replace the in-memory copy. The app asks for the version at most once every 5 minutes, so focusing the window again within 5 minutes of the last check asks nothing
- [x] AC-005: WHEN progress data changes in this tab or another one THEN system SHALL refresh every screen part that shows that data
- [x] AC-006: WHEN a screen showing progress data opens again THEN system SHALL show the remembered data at once and re-read it in the background, unless that data changed in this tab since it was read: then it SHALL wait for the new read, so a screen opened right after a change never acts on the earlier data

### P2: Errors and offline behave as before

- As a learner, I want the same error and retry behaviour so that nothing gets worse when the network is down
- **Why P2:** Keeps existing guarantees (001 AC-055)

**Acceptance Criteria:**

- [x] AC-007: WHEN content can't be downloaded and an earlier download exists THEN system SHALL show the earlier download as today, and try again on the next window focus
- [x] AC-008: WHEN content can't be loaded at all THEN system SHALL show the existing error with its retry button, and retrying SHALL load again instead of repeating the remembered error

## Edge Cases

- WHEN the learner changes level THEN system SHALL load the content of the new levels and keep the levels already loaded for reuse
- WHEN content was served from an earlier download (offline) and the connection comes back THEN system SHALL replace it on the next window focus even if the version did not change
- WHEN a screen is left before its data arrives THEN system SHALL drop the result for that screen without errors

## Success Criteria

- [x] Returning to Từ vựng, Ngữ pháp or Hôm nay within a visit shows no loading skeleton (checked in the browser)
- [x] A test shows that two components needing the same level read it once
- [x] All existing unit and end-to-end tests pass unchanged in what they check

## Open Questions

None.

## Notes

- Owner decision (2026-10-28): use an established data-fetching library rather than the handbook's hand-built hook, and add it to the workspace catalog. Recorded in `.agents/knowledge.md`.
- No timing was measured before the change; the checks are "no loading state on return" and read counts in tests.
- AC-006 got its exception during implementation: showing the remembered copy right after a write sent learners back to the placement test, because the home page read "placement pending" from memory just after the test was skipped. Found by the end-to-end suite.

## Evidence

- AC-004 throttle: `src/content/client.test.ts` "checks the version on focus at most once per VERSION_TTL_MS"
- AC-001 to AC-008: `src/hooks/shared-cache.test.tsx` (one test per criterion; AC-006 has both the remembered and the after-a-write case); `src/storage/broadcast.test.ts` for the in-tab change times
- Edge case, level change: `shared-cache.test.tsx` "loads the new levels after a level change and keeps the old ones"
- Returning to screens: a Playwright probe against the Cloudflare preview counted loading states while moving Từ vựng → Ngữ pháp → Hôm nay and back. First visits showed 1, 0 and 0; returning showed 0, 0 and 0 (2026-10-28)
- All 541 unit tests and all 10 end-to-end specs pass. The 11 component tests changed only their `render` import
- Goals and success criteria audited 2026-10-28: each is covered by the evidence above

## Baseline

### Current Behavior

- Content is kept in the browser with its version and downloaded again only after a new publish; offline, the last download is shown (001 AC-052 to AC-055)
- Progress screens re-read when progress changes in this tab or another one
- On window focus the app asks whether a new version was published and reloads content if so (on every focus; since this feature, at most once every 5 minutes)

### Gaps / Limitations

- Every screen and component reads content from browser storage again on each visit and rebuilds its lookups, so returning to a screen shows a loading state
- Two components needing the same data at once both read it, and both download it after a new publish
- Content served from an earlier download stays until the screen is opened again
