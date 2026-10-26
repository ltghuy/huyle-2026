---
id: "023"
feature: system-design-method
created: 2026-10-12
---

# Audit: Frontend System Design section, the design method

## Goals

- [x] Section no longer "coming soon": catalog activated (href, widened TopicSectionId, removed the sectionProgress special-case), sidebar folder added, `/system-design` route lists the method page, home copy updated. Browser-verified: section page shows no "coming soon" and lists the method page; build prerenders both routes.
- [x] A framework a senior can apply to any prompt: ordered stages with what to produce and the mistakes, worked against four sample products — not generic advice.
- [x] Each topic has an input-driven interactive reference, and figures are labelled examples — browser-verified: the stepper changes per-stage content with the product and across stages; the requirements and trade-off pickers change content; "one worked example / alternative named" copy present.

## Success Criteria

- [x] Section open everywhere, 1 of 1 page written — verified on the section page and build output.
- [x] Framework stepper changes per-stage content when the product changes and moves across all stages — browser-verified (feed vs chat; stage 1 vs 3).
- [x] Requirements and trade-off references change with the chosen product/decision — browser-verified.
- [x] axe clean in light and dark; no horizontal scroll at 360 px; keyboard-operable (native radios/buttons with focus rings). One light-mode contrast issue (info axis badge, 4.22:1) fixed by darkening the token in light mode.
- [x] typecheck, lint, build pass.

## Notes

- Deliberately no server lab: the content is a method, so the interactive pieces are client-side references driven by one shared dataset (`framework.ts`), reusable by the case-study pages to come.
- The four sample products (feed, autocomplete, chat, design system) match the section summary, so the method lines up with the planned case studies.
