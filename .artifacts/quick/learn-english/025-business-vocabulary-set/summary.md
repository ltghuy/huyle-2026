# Summary: Add the "Kinh doanh" (business) vocabulary set

## Changed

- New set `set:business` (B1, "Kinh doanh" / "Business"), 108 words in learning order:
  57 reused approved course words (customer, profit, contract, negotiate, merger, investor, export…)
  and 51 new specialized words (sales representative, market share, cash flow, balance sheet,
  supply chain, KPI, venture capital, return on investment…), each with 2 B1 examples (102 sentences).
- Course words that only carry an everyday meaning (pitch, lead, forecast, margin, quarter) are not reused.
  Business compounds are drafted instead (sales pitch, lead time, sales forecast, profit margin, quarterly).
- Drafted in-session and imported with `content:draft import`. Everything has status `draft`.

## Files

- apps/learn-english/content/{set,word,sentence}/set-business.json (new)
- apps/learn-english/content/.review/set-business.html (review sheet, untracked tooling output)

## Verification

- `content:draft import --check`: 154 items, 0 problems
- `content:review approve set-business --all --dry-run`: 154 approved, 0 refused
- `pnpm test`: 755 passed
- `content:publish --dry-run`: the 154 drafts are skipped until approved

## Approval (2026-10-29)

- The owner approved everything: `content:review approve set-business --all` → 154 approved.
- `content:audio generate --provider kokoro --voice am_adam --scope set-business`: 51 word and 102 sentence clips, keys saved.
- `content:publish --dry-run`: set:business has 108 words and 202 sentences, 1 to upsert (version 12). `pnpm test`: 755 passed.
- Still to do (owner): `pnpm content:audio deploy`, then `pnpm content:publish --remote`.

## Follow-up (owner, original plan)

1. Review `content/.review/set-business.html`, then `pnpm content:review approve set-business --ids-file <review-set-business.json>`.
   Check these IPA entries: CEO, KPI, rebrand (not in CMUdict), lead time, overhead, networking, break even, return on investment.
2. `pnpm content:review approve content/set/set-business.json --all`
3. `pnpm content:audio` for scope set-business, then `pnpm content:publish`.
