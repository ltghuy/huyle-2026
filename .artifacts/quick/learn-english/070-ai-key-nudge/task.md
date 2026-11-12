---
slug: ai-key-nudge
status: done
branch: main
created: 2026-11-12
---

# Quick Task: Suggest adding an AI key in "Viết câu"

## What

In the "Viết câu" tab of the exercise library, a signed-in learner who has no AI key on this device sees a small notice that an AI key makes the writing practice better, with a button to the "Chấm điểm bằng AI" card in Cài đặt.

## Files

- `apps/learn-english/src/components/library/ai-key-notice.tsx` (new)
- `apps/learn-english/src/components/library/exercise-library.tsx`
- `apps/learn-english/src/components/library/exercise-library.test.tsx`

## Expected Outcome

- Shown only in "Viết câu", above the topic cards, when the learner is signed in and has added no key (a key that is out of quota or invalid still counts as set up; Cài đặt explains those)
- Low-key: a neutral bordered row like the backup reminder, one sentence, an outline "Thêm khóa AI" link to `/settings#cham-bang-ai`, and an "Ẩn gợi ý" (X) button that hides it while the learner stays in the tab; coming back to "Viết câu" without a key shows it again (owner, 2026-11-12)
- Hidden for guests, who must sign in before practising anyway, and as soon as a key is added (the key list is a live store)

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
