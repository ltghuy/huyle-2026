---
id: "004"
feature: infinite-scroll
audited: 2026-10-06
result: passed
---

# Audit: Infinite Scroll

Evidence from a production build in headless Chrome and curl (see tasks.md notes). User sign-off given; no motion-only criteria in this feature.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Read the whole feed with no clicks | Met | Full scroll loaded all 25 pages automatically, ahead of the end (400 px trigger distance) |
| G2: Every post exactly once, in order, with new posts arriving | Met | 500 unique, strictly descending, with 3 posts simulated mid-scroll; server paging verified separately with a mid-way page size change |
| G3: Reading position never jumps on its own | Met | 0 px movement across appends; new posts held behind the pill; restoration returns the same anchor and offset |
| G4: Keyboard and screen reader users can read, load more, and follow progress | Met | Feed pattern with focusable, positioned, labelled articles; Page Down/Up; Load more button; polite announcements for loads, errors, end and new posts |
| SC1: One request per page, zero duplicates/gaps, incl. new posts mid-scroll | Met | Requests 25 = pages 25 (stats line and network entries agree); 500 unique, contiguous |
| SC2: No task > 50 ms on append; first visible post within 1 px | Met | 0 long tasks; max movement 0 px |
| SC3: Restoration within 1 post, zero requests | Met | Same post #414 at the same −65 px offset; scrollTop 6000 → 6000; 0 page requests |
| SC4: 0 serious/critical a11y issues with posts loaded | Met | axe-core 4.10: only the pre-existing moderate `region` |

## Known minor issues (not blocking)

- Verified by code inspection only: "99+" cap, 0 and 1200 px trigger distances, no focus movement on load, reduced-motion instant scroll.
- Demo control values reset when leaving the practice (only the feed is restored, as specified).
