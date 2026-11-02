---
slug: accuracy-line-chart
completed: 2026-11-02
---

# Summary: Show 30-day accuracy as a line chart

## What Changed

`accuracy()` now groups answers by local day instead of by week (placement answers are still left out). The weekly bars are replaced by an SVG line chart: the x axis runs from the first to the last day with answers in the last 30 days, so the line fills the width even after a few days (a single day sits in the middle), with date labels at both ends and one in the middle for spans of 4 days or more (today reads "Hôm nay"), the y axis runs from 0% to 100% with gridlines at 0/50/100, and there is one dot for each day with answers. Hovering shows a crosshair and that day's accuracy with its answer count. A visually hidden list ("Độ chính xác theo ngày") gives the same numbers to screen readers. No chart library was added.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/profile/progress-math.ts` | `accuracy()` returns `days` (was `weeks`); new `addDays`, `daysBetween` |
| `apps/learn-english/src/components/profile/progress-insights.tsx` | `AccuracyChart` replaces the weekly bars; `loadProgress` returns `today` |
| `apps/learn-english/src/components/profile/profile.test.tsx` | Asserts the per-day points |

## Follow-Up

- A day with only a few answers (for example 0/3) makes a deep dip in the line. A 7-day rolling accuracy would make the trend smoother if the dips get confusing.
