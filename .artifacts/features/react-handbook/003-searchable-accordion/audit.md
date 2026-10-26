---
id: "003"
feature: searchable-accordion
audited: 2026-10-06
result: passed
---

# Audit: Searchable Accordion

Evidence from a production build in headless Chrome (see tasks.md notes), plus the user's UAT sign-off for AC-005 (expand/collapse motion).

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Find answers without exact wording, category or accents | Met | All-words, any-order, accent/case-insensitive matching: `cafe`, `RESUME`, `zurich`, `naive`, `card refund` all return the expected sections |
| G2: Accessible accordion pattern | Met | h3 > button with aria-expanded/aria-controls, labelled panels, `inert` when collapsed, Up/Down/Home/End/Escape; axe 0 serious/critical |
| G3: Every match visible | Met | Highlights in questions and open answers; "Match in answer" badge + highlighted snippet for collapsed answer-only matches |
| G4: Instant filtering at 10× content | Met | 400 sections: max frame 9.4 ms, 0 frames over 16 ms |
| SC1: < 16 ms per keystroke with ~400 sections | Met | Input handler ≤ 2.6 ms; frame gaps max 9.3 ms typing, 9.4 ms worst case (clear → all 400) |
| SC2: 0 serious/critical a11y issues, search active, sections open + collapsed | Met | axe-core 4.10: 1 moderate `region` (pre-existing sidebar wrapper) only |
| SC3: All keyboard interactions work | Met | Scripted walkthrough of Down (from search), Up/Down wrap, Home, End, Escape, Enter/Space via native buttons; Tab order excludes collapsed answers (`inert`) |
| SC4: 10 sample queries return expected sections + highlights | Met | 12-query table in tasks.md, all exact |

## Known minor issues (not blocking)

- Keyboard checks used synthetic key events; real Tab-order traversal relies on native buttons and `inert` (code inspection).
- Reduced motion relies on the global reduced-motion rule (code inspection).
