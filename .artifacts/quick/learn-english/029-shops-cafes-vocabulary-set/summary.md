---
slug: shops-cafes-vocabulary-set
completed: 2026-10-30
---

# Summary: Add small-shop and café words to the "Kinh doanh" (business) set

## What Changed

A separate "Quán ăn & cửa hàng" set (116 words, 32 new) was drafted first. The owner then asked for the vocabulary to go into the business set instead. That set already had 108 words and the cap is 120, so the owner picked the 12 most useful new words: cashier, cash register, opening hours, small business, foot traffic, regular customer, loyalty card, service charge, delivery fee, bank transfer, e-wallet and grand opening. They are appended to `set:business` with their 24 example sentences. The other 20 drafted words and the separate set were deleted. `set:business` was set back to draft for the edit and approved again with the owner's approval. Its existing 51 words and 102 sentences are unchanged.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/content/set/set-business.json | 12 word ids appended (120 words) |
| apps/learn-english/content/word/set-business.json | 12 new specialized words |
| apps/learn-english/content/sentence/set-business.json | 24 new example sentences |

Verification: the draft check gave 0 problems; the owner approved everything; `content:audio generate --scope set-business` made 12 word and 24 sentence clips; `content:publish --dry-run` shows set:business with 120 words and 226 sentences; `pnpm test` passed 788 tests; `content:publish --local` published version 14, and the local API serves set:business with 120 words.

## Patterns Discovered

CMUdict can give a multi-word noun its verb stress (bank transfer came out as /trænˈsfɝ/). Flag such words with `ipaOk: false` so the drafted IPA is used.

## Follow-Up

- Owner: `pnpm content:audio deploy`, then `pnpm content:publish --remote`.
- The business set is at the 120-word cap; more shop words (barista, street food, set meal, QR code…) would need a new set or a higher cap.
