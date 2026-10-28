---
slug: c1-irregular-verbs
completed: 2026-10-28
---

# Summary: Irregular verb forms for C1

## What Changed

The C1 word list has three irregular verbs: oversee, overdraw and shed. The owner asked for them in the irregular verbs section, so the 008 spec now counts them in scope (111 verbs). Their forms were drafted with two practice sentences each, approved by the owner, given IPA and one "base, past, participle" clip each, and published to production as content v7. The verbs page level filter used a hard-coded A1–B2 list and now uses `LEVELS`. With six tabs the row overflowed a 375 px screen, so on phones the tabs drop their minimum width and share the row; larger screens keep `min-w-14`.

## Files Modified

| File | Change |
|------|--------|
| `.artifacts/features/learn-english/008-irregular-verbs/spec.md` | Out of Scope row and an owner decision note for the C1 verbs |
| `apps/learn-english/src/components/verbs/verbs-browser.tsx` | Level tabs from `LEVELS`; tabs share the row below `sm` |
| `apps/learn-english/src/components/verbs/verbs-browser.test.tsx` | A C1 verb (shed) in the fixtures; the C1 tab filters to it |
| `apps/learn-english/content/forms/C1.json` | The 3 approved forms with IPA and audio keys |

## Patterns Discovered

CMUdict puts the primary stress on "over-" for oversaw, overseen, overdrew and overdrawn (and two primaries on overdrawn). They were set by hand to match the approved base IPA; `content:ipa` keeps hand-set form IPA.

## Follow-Up

Verified in production: the live API serves 111 forms and the C1 ones match the source, the 3 clips return 200 audio/mpeg, and the verbs page shows the C1 tab with the three verbs and no sideways scroll at 375 px (app version cdda09f5).
