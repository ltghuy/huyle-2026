---
slug: vocab-instant-levels
status: done
branch: main
created: 2026-11-15
---

# Quick Task: Vocabulary switches level instantly, like Irregular verbs

## What

Từ vựng lists words from the all-levels word cache (`useAllWords`, which Động từ bất quy tắc and the search box already use) and filters by level in memory, instead of waiting for the selected level's content index.

## Files

- apps/learn-english/src/components/vocabulary/vocabulary-browser.tsx
- apps/learn-english/src/components/vocabulary/vocabulary-browser.test.tsx
- .artifacts/features/learn-english/001-learn-english-app/spec.md (AC-006)

## Expected Outcome

After the first load, choosing A1, A2, B1, B2 or C1 shows the level's topics, progress and words at once, with no skeleton. The per-level content index (example sentences, irregular forms, sets) still loads in the background for the word dialog and the "Chuyên ngành" tab, which keep their own loading states. Sentences stay per level: all levels together are about 21 MB of source.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
