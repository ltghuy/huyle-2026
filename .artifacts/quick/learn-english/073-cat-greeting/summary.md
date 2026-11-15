---
slug: cat-greeting
completed: 2026-11-15
---

# Summary: The home cat greets the learner; the header keeps only the bell and the picture

## What Changed

The greeting moved from the header pill to the home cat. `MascotShowcase` reads the learner's name the same way the header did (`learnerName`: chosen name, else Google name; none for guests) and shows "Xin chào {tên}!" and "Cùng cải thiện tiếng Anh nhé!" on two lines. The bubble is now `w-max max-w-60` so a long name wraps instead of stretching it. `AccountLink` drops the greeting and no longer reads the profile; the 👋 wave animation it used is gone from `globals.css`.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/home/mascot-showcase.tsx | Bubble greets by name, new wording |
| apps/learn-english/src/components/shell/account-link.tsx | Greeting removed |
| apps/learn-english/src/app/globals.css | Unused `wave` animation removed |
| apps/learn-english/src/components/{account,shell}/*.test.tsx | Tests follow the move |
| .artifacts/features/learn-english/{003,021,022,031}/spec.md | ACs reworded |

## Patterns Discovered

None

## Follow-Up

The bubble shows only from `lg`, so phones and tablets no longer show the learner's name anywhere on screen.
