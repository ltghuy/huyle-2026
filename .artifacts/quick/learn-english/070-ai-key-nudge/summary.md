# Summary: Suggest adding an AI key in "Viết câu"

## Changed

- `src/components/library/ai-key-notice.tsx` (new): `AiKeyNotice` reads the key list from the live `ai-keys` store and renders nothing once any key is saved. Otherwise it shows a neutral bordered row (Sparkles icon, muted text) in the shape of the backup reminder: one sentence, an outline "Thêm khóa AI" link to `/settings#cham-bang-ai` (the existing anchor of the "Chấm điểm bằng AI" card) and an "Ẩn gợi ý" button. Dismissing hides it only while the learner stays in the tab: the notice unmounts when another tab or page opens, so it shows again on coming back without a key. (A first version kept it hidden for the browser session; the owner asked for it to come back.)
- `src/components/library/exercise-library.tsx`: renders the notice above the cards in "Viết câu" for signed-in learners only.
- `src/components/library/exercise-library.test.tsx`: shown in "Viết câu" with the right link and gone once a key is added; not shown in "Nghe chép"; hidden after dismissing and shown again after switching tabs and back; not shown to guests.

## Gates

- `pnpm --filter learn-english typecheck` and `lint` pass
- `pnpm --filter learn-english test`: 185 files, 1597 tests pass

## Not checked

- In a real browser: the notice is for signed-in learners, and the headless browser used for checks is a guest. The unit tests cover when it shows and hides.
