---
slug: farming-vocabulary-set
completed: 2026-10-31
---

# Summary: Add the "Chăn nuôi & trồng trọt" (livestock and crops) vocabulary set

## What Changed

Added a new specialized set `set:farming` (B1, "Chăn nuôi & trồng trọt" / "Livestock & Crops") with 115 words in learning order: 87 reused approved course words (farmer, countryside, paddy terrace, soil, harvest, cattle, calf, herd, hay, barn, vaccine, farmland, seedling…) and 28 new specialized words, each with 2 B1 examples (56 sentences). The new words are livestock, poultry, paddy field, irrigation, fertilizer, pesticide, pest, tractor, plow, hoe, water buffalo, hen, rooster, chick, piglet, chicken coop, pigsty, dairy farm, fish farm, graze, pasture, compost, manure, crop rotation, cash crop, sow (verb), crop yield and scarecrow. Drafted in-session and imported with `content:draft import`; everything has status `draft`.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/content/set/set-farming.json | new: the set item |
| apps/learn-english/content/word/set-farming.json | new: 28 specialized words |
| apps/learn-english/content/sentence/set-farming.json | new: 56 example sentences |
| apps/learn-english/content/.review/set-farming.html | review sheet (untracked tooling output) |

Verification: `content:draft import --check` gave 85 items and 0 problems; `content:review approve set-farming --all --dry-run` gave 85 approved and 0 refused; `pnpm test` passed 788 tests.

## Patterns Discovered

- The draft check caught two words (farmland, seedling) that the course already has at B1 and C1; they are reused by id. Check every candidate headword against all content files, not only the obvious topic.
- CMUdict gave the verb "sow" the noun's /saʊ/; it is flagged `ipaOk: false` so the drafted /soʊ/ is used. Kokoro may read the word alone as /saʊ/ too, so listen to its clip.

## Approval (2026-10-31)

- The owner approved everything: `content:review approve set-farming --all` → 85 approved.
- `content:audio generate --provider kokoro --voice am_adam --scope set-farming`: 28 word and 56 sentence clips, keys saved.
- Kokoro's phonemizer (phonemizer 1.2.1, en-us) reads "sow", "sow the seeds" and "sowed" as /soʊ/, so the clips say the verb.
- `content:publish --dry-run`: set:farming has 115 words and 192 sentences, 1 to upsert. `pnpm test`: 788 passed.
- `content:publish --local`: version 15; the local API serves set:farming with 115 words.

## Follow-Up

- Owner: `pnpm content:audio deploy`, then `pnpm content:publish --remote`.
