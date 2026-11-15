---
slug: vocab-instant-levels
completed: 2026-11-15
---

# Summary: Vocabulary switches level instantly, like Irregular verbs

## What Changed

Từ vựng waited for the selected level's content index (words, sentences, writing tasks and wordings of that level) before showing anything, so every new level flashed a skeleton. The list now comes from `useAllWords`, the all-levels word cache the irregular verbs page and the search box already use, grouped by level in memory (`wordsByLevel`: course words only, sorted with `bySortThenId`, now exported from `content-index.ts`). The per-level index still loads behind the list; only the word dialog (examples, forms) and "Chuyên ngành" wait for it, with their own loading and error states. AC-006 of feature 001 was updated first.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/vocabulary/vocabulary-browser.tsx | Lists from all-levels words; index only for dialog and sets |
| apps/learn-english/src/lib/session/content-index.ts | `bySortThenId` exported |
| apps/learn-english/src/components/vocabulary/vocabulary-browser.test.tsx | Instant switch while the index loads; waits for all words |
| .artifacts/features/learn-english/001-learn-english-app/spec.md | AC-006 reworded |

## Patterns Discovered

Sentences for every level are about 21 MB of source against 5.6 MB of words, so screens that need instant level switching should filter the shared all-levels word cache and keep sentences per level.

## Follow-Up

The first visit to Từ vựng now downloads the words of all five levels (as Động từ bất quy tắc already did), instead of one level. `src/sync/sync-client.test.ts` "pushes with keepalive when the page is hidden" fails now and then; untouched here.
