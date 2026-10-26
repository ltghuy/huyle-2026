---
id: "023"
feature: system-design-method
created: 2026-10-12
---

# Tasks: Frontend System Design section, the design method

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 --> T005
                         (demos in one file group)
```

T001 activates the section + shell. T002 writes the shared dataset. T003
builds the three demos. T004 writes the topic notes. T005 verifies + audits.

## Quality Gates

Run after each task or batch: pnpm lint · pnpm typecheck · pnpm build.

## Tasks

- [x] T001 Activate the `system-design` section (catalog: path, href, widen `TopicSectionId`, remove the sectionProgress special-case, add the `method` topic page; sidebar folder; home copy; playground spec note) and add the section route + method route with a content skeleton (intro, TOC, three `Topic` placeholders)
  - **Done when:** `/system-design` lists the method page (1 of 1 written); `/system-design/method` shows breadcrumbs, title and TOC; System Design is no longer "coming soon" in sidebar or home card.

- [x] T002 [B:T001] Write `framework.ts`: STAGES (ordered, produce + mistakes), PRODUCTS (feed, autocomplete, chat, design-system: brief, per-stage notes, functional, non-functional, questions), DECISIONS (rendering, data-fetching/caching, pagination, state location, realtime: options with what/wins/costs)
  - **Done when:** types compile; each product has a note for every stage; each decision has ≥2 options.

- [x] T003 [B:T002] Build the three demos: framework stepper + product picker (per-stage worked note, "example" label, alternative named); requirements reference (functional / non-functional / questions, reveal toggles); trade-off explorer (decision picker → option cards + the axes it serves)
  - **Done when:** changing the product changes the stepper's per-stage note; stepping moves across all stages; changing the decision changes the option cards; all keyboard-operable.

- [x] T004 [B:T003] Write the three topics (intro, points, advice, read-more with references, forward pointer to the case studies) and the page + section intros
  - **Done when:** each topic reads in about one screen; links open in a new tab; a figure is labelled an example with an alternative.

- [x] T005 [B:T004] Verify (gates, axe light/dark, 360 px, keyboard), update knowledge.md, audit
  - **Done when:** typecheck, lint, build pass; ACs marked with evidence; audit written.
