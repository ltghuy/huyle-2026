---
slug: tour-step-on-screen
completed: 2026-11-04
---

# Summary: Tour steps stay on screen

## What Changed

There were two causes.

- **Card in the corner.** The tour measured its targets once, when it started. For a signed-in learner the lesson area can render a skeleton and then the card, so the step held an element that had left the page. floating-ui measured it as an empty box at (0, 0) and put the card in the corner, while the spotlight kept its first position. Each step's target is now a ref that the step keeps for the whole tour, so its props never change (a changed target or side re-registers the step and breaks the order). While a step is shown, a `MutationObserver` points the ref at the live element whenever the old one leaves the page, and the steps re-render.
- **Target cut off.** With `value` controlled, the tour primitive returns before its auto-scroll, so nothing ever scrolled. Each step now scrolls by `scrollDelta`: enough to show the target with room for the card on its side (260 px above or below). A target taller than that keeps its top in view. `sideFor` now puts the card above a target when the target and the card can't both fit below it. The room is the step card's measured height plus its 28 px gap (260 px only before it renders), so a 420 px lesson card and a 132 px step both fit on a 623 px screen. On a screen shorter than the two together, the target's top stays in view below the step and its bottom is cut.

- **Scroll undone on replay.** A signed-in tour starts at the lesson card, so its first step scrolls down. Starting from `/?tour=1` then calls `router.replace("/")`, and Next.js scrolls to the top on navigation by default, so the card ended up cut off again. The replace now passes `{ scroll: false }`. Guests never saw this because their first step is the account button at the top.

I checked the guest tour in the browser at 1288 px wide: the lesson step scrolls the card fully into view with the step above it, and the sidebar steps still sit beside their items. I couldn't sign in from the browser, so the signed-in element swap is covered by the code path and not seen live.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/tour/tour-steps.ts | `sideFor` tall rule, `scrollDelta`, `CARD_ROOM_Y` |
| apps/learn-english/src/components/tour/app-tour.tsx | ref targets, `followTarget`, `scrollToStep` |
| apps/learn-english/src/components/tour/tour-steps.test.ts | tests |

## Patterns Discovered

Dice UI's tour skips `autoScroll` when `value` is controlled, so the controlling component has to scroll. A `RefObject` target lets the element change without changing the step's props.

## Follow-Up

None.
