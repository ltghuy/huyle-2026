---
slug: drop-old-route-redirects
completed: 2026-10-29
---

# Summary: Drop the old Vietnamese route redirects

## What Changed

`next.config.ts` no longer has `RENAMED`, `RENAMED_KEYS` or `redirects()`. The OpenNext import moved to the top with the others, and its dev setup call is marked `void` since nothing awaits it. The knowledge entry from quick 002 now says the redirects were removed.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/next.config.ts` | Redirects removed, imports grouped |
| `.agents/knowledge.md` | Quick 002 entry updated |

## Patterns Discovered

None.

## Follow-Up

None.
