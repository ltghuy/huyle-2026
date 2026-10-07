---
slug: practice-guides
status: done
branch: main
created: 2026-10-07
---

# Quick Task: Turn "How it works" into a practice guide with "Read more"

## What

Rewrite each built practice's "How it works" panel as a learner guide: a short intro that is always visible, plus an expandable full version covering use cases, approach, best practices and how to use the demo controls. The content comes from that feature's artifacts.

## Files

- `src/components/playground/practice-guide.tsx` (new, server): shared building blocks so every guide has the same shape: `Intro`, `ReadMore` (native `<details>`/`<summary>`, no client JS), `GuideSection`, and `ControlGuide` (a control → "what to look for" list)
- `src/components/playground/practice-frame.tsx`: panel styles for the new parts (no structural change)
- `src/practices/{toast-notifications,searchable-accordion,infinite-scroll,data-fetching-hook,realtime-chat}/explanation.tsx`: rewritten content, one per built practice
- `.artifacts/features/001-practice-playground/spec.md`: AC-010 says "a short explanation"; reword it to "a short intro with an expandable full guide" (changed behavior → spec first)
- `.agents/knowledge.md`: a Decision that future practices write their explanation with this template

Scope note: this touches 8 files, which is above quick mode's ≤ 3. It stays a quick task because it is mostly content following one pattern and needs no architecture decisions. Say so if you'd rather run it as a feature (007).

## Guide template (per practice)

**Always visible (about the size of today's panel or smaller)**

1. **What it is**: 1–2 sentences on the pattern and the problem it solves. Source: spec Overview.
2. **Key ideas**: 3–4 one-line bullets naming the techniques. Source: spec Notes and design Decisions.

**Behind "Read more"**

3. **Where you'd use it**: 2–3 real app use cases. Source: spec Overview and user stories.
4. **How we built it**: a short walkthrough of the approach in plain language, no line-by-line detail. Source: design Decisions and Data Flow.
5. **Best practices**: do / avoid pairs, including accessibility and performance. Source: decisions.md rationale, design Considerations, `.agents/knowledge.md` gotchas.
6. **Try it with the demo controls**: one row per control with what to watch for (e.g. "Drop connection → status goes Reconnecting, then the Stream stats count replayed messages"). Source: spec "Demo controls" story and Edge Cases.
7. **Trade-offs and limits**: what we chose not to do and known limits. Source: spec Out of Scope, decisions.md, audit "Known minor issues".

## Expand behavior

- `<details>` with a `<summary>` that reads "Read more" when closed and "Show less" when open (CSS `[open]`), so the panel stays a server component with no hydration.
- Collapsed by default; the browser's find-in-page still reaches the hidden text (Chrome expands `<details>` on a match).
- Summary is keyboard-focusable with a visible focus ring; an icon (`ChevronDown`) rotates on open and respects reduced motion.
- No state is remembered between visits (keeps it simple; revisit if it's annoying).

## Order of work

1. Update 001 spec AC-010, add the knowledge Decision.
2. Build `practice-guide.tsx` and restyle the panel; convert the toast practice as the pilot.
3. Show the pilot to you for tone and length before converting the other four.
4. Convert accordion, infinite scroll, data-fetching hook, realtime chat.
5. Check each page: collapsed panel no taller than today's, keyboard toggle, light + dark, 360 px, axe.

## Expected Outcome

- Each built practice opens with a short, readable intro; "Read more" expands the full guide in place.
- Every guide has the same seven sections, with content matching that feature's spec, decisions and design (no behavior described that the code doesn't have).
- The demo-controls section tells the learner what each control is for and what to watch.
- No new client JS for the panel; no new dependencies.

## Quality Gates

Run after the change, before marking done:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Manual: each practice page in light + dark at 1280 px and 360 px; axe-core shows no new serious/critical issues
