---
slug: transportation-vocabulary-set
completed: 2026-10-30
---

# Summary: Add the "Giao thông" (transportation) vocabulary set

## What Changed

Added a new specialized set `set:transportation` (B1, "Giao thông" / "Transportation") with 117 words in learning order: 93 reused approved course words (car, scooter, passenger, intersection, roundabout, traffic jam, helmet, boarding, runway, customs…) and 24 new specialized words, each with 2 B1 examples (48 sentences). The new words are seat belt, motorbike taxi, ride-hailing app, speed limit, traffic sign, zebra crossing, one-way street, parking lot, gas station, flat tire, driving test, license plate, U-turn, traffic police, commuter, boarding pass, connecting flight, baggage claim, one-way ticket, round trip, sleeper bus, bike lane, jet lag and pothole. Parking lot and gas station link to the course words car park and petrol station as synonyms. The set was drafted in-session and imported with `content:draft import`, so everything has status `draft`.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/content/set/set-transportation.json | new: the set item |
| apps/learn-english/content/word/set-transportation.json | new: 24 specialized words |
| apps/learn-english/content/sentence/set-transportation.json | new: 48 example sentences |
| apps/learn-english/content/.review/set-transportation.html | review sheet (untracked tooling output) |

Verification: `content:draft import --check` gave 73 items and 0 problems; `content:review approve set-transportation --all --dry-run` gave 73 approved and 0 refused; `pnpm test` passed 788 tests.

## Patterns Discovered

None.

## Approval (2026-10-30)

- The owner approved everything: `content:review approve set-transportation --all` → 73 approved (the set item included).
- `content:audio generate --provider kokoro --voice am_adam --scope set-transportation`: 24 word and 48 sentence clips, keys saved.
- `content:publish --dry-run`: set:transportation has 117 words and 194 sentences, 1 to upsert (version 13). `pnpm test`: 788 passed.
- `content:publish --local`: version 13 is in the local D1.
- The owner ran `pnpm content:audio deploy` and `pnpm content:publish --remote`; the set works on production.
- Local check: `pnpm dev` serves `set:transportation` (117 words) from `/api/content/items?kind=set`.

## Follow-Up (original plan)

Owner steps:

1. Review `content/.review/set-transportation.html`, then `pnpm content:review approve set-transportation --ids-file <review-set-transportation.json>`. Check these IPA entries, which CMUdict composed from parts or lacked: motorbike taxi, ride-hailing app, U-turn, pothole, one-way street, one-way ticket.
2. `pnpm content:review approve content/set/set-transportation.json --all`
3. `pnpm content:audio generate --provider kokoro --voice am_adam --scope set-transportation`, then `pnpm content:audio deploy` and `pnpm content:publish --remote`.
