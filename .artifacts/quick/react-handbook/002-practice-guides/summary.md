---
slug: practice-guides
completed: 2026-10-07
---

# Summary: Turn "How it works" into a practice guide with "Read more"

## What Changed

Every built practice's "How it works" panel is now a learner guide: a short intro and four key ideas are always visible, and a native "Read more" / "Show less" disclosure expands the full guide with five sections: Where you'd use it, How we built it, Best practices (do / avoid), Try it with the demo controls (one row per control saying what to watch for), and Trade-offs and limits. Content was written from each feature's spec, decisions, design and audit and checked against the code. The collapsed panel is about half the height of the old one, and the panel still ships no client JavaScript.

## Files Modified

| File | Change |
|------|--------|
| `src/components/playground/practice-guide.tsx` | New server building blocks: `Intro`, `KeyIdeas`, `ReadMore` (`<details>`), `GuideSection`, `DoAvoid`, `ControlGuide` |
| `src/practices/toast-notifications/explanation.tsx` | Rewritten as a guide (pilot, reviewed by the user) |
| `src/practices/searchable-accordion/explanation.tsx` | Rewritten as a guide |
| `src/practices/infinite-scroll/explanation.tsx` | Rewritten as a guide |
| `src/practices/data-fetching-hook/explanation.tsx` | Rewritten as a guide |
| `src/practices/realtime-chat/explanation.tsx` | Rewritten as a guide |
| `.artifacts/features/react-handbook/001-practice-playground/spec.md` | AC-010 now describes the guide with "Read more" |
| `.artifacts/features/react-handbook/005-data-fetching-hook/decisions.md`, `design.md` | Retry rule synced with the code: every 4xx (not only 404) is not retried |
| `.agents/knowledge.md` | Decision: practices write their explanation with the guide template |

`practice-frame.tsx` needed no change: the guide blocks carry their own styles.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- All 5 pages: 4 key ideas and the 5 sections in order; collapsed panel 305–344 px (toast was ~590 px before); expanded 1741–2153 px; no literal HTML entities in the text.
- "Read more" toggles to "Show less" and back, keyboard focusable; chevron rotates (reduced-motion safe).
- axe-core 4.10.2 with every guide open, light + dark: 0 serious / critical on all 5 pages (only the pre-existing moderate `region`).
- 360 px: no guide content overflows on any page.

## Patterns Discovered

- Guide content is plain JSX in each practice's `explanation.tsx`; text inside JS string props (e.g. `ControlGuide` rows) uses plain apostrophes, only JSX text needs `&apos;`.

## Follow-Up

- Pre-existing (feature 005): at 360 px the data-fetching page is 651 px wide because the cache inspector table (`min-w-[44rem]`) stretches its container even though its wrapper has `overflow-x-auto`; a parent likely needs `min-w-0`. Not fixed here (out of scope).
- Feature 005 decisions said only 404 skips retries while the code skips every 4xx; docs were updated to match the code (the spec's 404 edge case still holds).
