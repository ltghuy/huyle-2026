---
id: "001"
feature: practice-playground
audited: 2026-10-06
result: passed
---

# Audit: React Practice Playground (Shell)

Evidence was gathered on a production build (`next build && next start`) in headless Chrome.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: All 14 practices reachable from the sidebar in one click | Met | Nav renders 14 links in catalog order; clicking one swaps the content with no document reload |
| G2: Shareable address per practice, survives refresh | Met | 14 prerendered URLs return 200 when loaded directly; back/forward restores the previous practice; unknown slug returns 404 |
| G3: Same layout on every practice page | Met | Probe practice rendered header → explanation → controls → stage; unbuilt practices render header → placeholder through the same frame |
| G4: New practice added without touching shell code | Met | T011 probe was added with only its folder, its route file and its catalog flag; no sidebar, overview or layout edits |
| SC1: Practice switch under 300 ms (warm, production) | Met | 24 ms from click to new title (Toast → Accessible Modal) |
| SC2: All 22 ACs pass; keyboard reaches every practice | Met | 22/22 ACs marked by verify. Nav items are native links in tab order with a `focus-visible` ring; ring contrast raised to ≥4.3:1 during the audit (was ~2:1 in light mode) |
| SC3: No serious/critical a11y violations (overview + placeholder page) | Met | axe-core 4.10: 0 serious, 0 critical on both pages; 1 moderate (`region`: the generated sidebar wrapper sits outside a landmark) |
| SC4: Follow-up practice addable without editing sidebar/overview/layout | Met | Same evidence as G4 |

## Fixes made during the audit

- Light-mode sidebar focus ring contrast was ~2:1 (fails WCAG 1.4.11's 3:1 for non-text). Tokens changed: light `--sidebar-ring` 0.708 → 0.556 (4.5:1 on the sidebar), dark 0.556 → 0.708 (6.9:1).

## Known minor issues (not blocking)

- axe `region` (moderate): the shadcn sidebar's outer wrapper isn't inside a landmark.
- Not-found page tab title is the default "React Practices", not "Practice not found".
- The overview card focus ring uses `ring-ring/50`, a softer ring than the sidebar's; revisit if keyboard use on the overview matters.
