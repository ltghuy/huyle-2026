---
slug: full-width-text
completed: 2026-10-21
---

# Summary: Let page text use the full content width

## What Changed

Removed every `max-w-2xl` and `max-w-3xl` cap on page text, so summaries, topic intros and section prose now wrap at the edge of the 80rem content column like the demos below them. This covers the practice, topic and section index frames, the shared topic section body, each handbook topic intro, and the home and React Practices index pages. The caps on demo inputs and controls (`max-w-xs`, `max-w-sm`, `max-w-md`) were kept. Checked on the Origins, DNS and CORS page at 1680px.

## Files Modified

| File | Change |
|------|--------|
| src/components/playground/practice-frame.tsx, topic-frame.tsx, section-index.tsx | Summary paragraph no longer capped |
| src/handbook/topic.tsx | Section body no longer capped |
| src/handbook/**/content.tsx, system-design/news-feed.tsx, system-design/autocomplete.tsx | Topic intro no longer capped |
| src/app/(playground)/page.tsx, react-practices/page.tsx | Intro and section text no longer capped |

## Patterns Discovered

None

## Follow-Up

On a 1680px screen a line of body text now holds about 180 characters. If that turns out to be hard to read, a single shared cap such as `max-w-[90ch]` on the prose blocks would be the place to start.
