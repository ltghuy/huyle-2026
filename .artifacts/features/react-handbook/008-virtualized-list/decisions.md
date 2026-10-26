---
id: "008"
feature: virtualized-list
created: 2026-10-07
---

# Decisions: Virtualized Large Lists

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Row heights

- **Question:** Fixed-height rows, variable measured rows, or both?
- **Decision:** Variable heights: each row starts with an estimated height and switches to its measured height once drawn; the scroll position is corrected so the view doesn't jump.
- **Rationale:** The real-world case; fixed height hides the hard parts.
- **Caveats:** The estimated height is a demo control so poor estimates can be watched.

### Data size and source

- **Question:** How many rows, and from where?
- **Decision:** Generated in the browser from a fixed seed, 1,000 to 100,000 rows (default 10,000). The same row number always has the same content.
- **Rationale:** Big enough to freeze a naive render, no network wait, and no overlap with practice 3's server paging.
- **Caveats:** More than 100,000 rows would need scroll-height scaling (browser maximum element height); out of scope.

### Extras

- **Question:** Which extras beyond the core window?
- **Decision:** All four: naive vs virtualized toggle with live numbers, jump to row + keyboard navigation (list box pattern), filter + sort, overscan control + debug view.
- **Rationale:** Each shows a separate real requirement of virtualized lists.
- **Caveats:** Makes the feature Complex scope.

### Scroll container

- **Question:** Inner box, the page, or both?
- **Decision:** A fixed-height inner box, like practice 3.
- **Rationale:** Easiest to reason about; window scrolling is explained as a trade-off in the guide.
- **Caveats:** None.

### Naive mode limit

- **Question:** Rendering 100,000 variable-height rows naively can lock the tab for many seconds; allow it?
- **Decision:** Naive mode is available up to 20,000 rows; above that it's disabled with a visible reason (agent default, not asked).
- **Rationale:** Still shows a large, measurable difference without making the demo unusable.
- **Caveats:** Revisit if the learner wants to see the full freeze.

## Tentative

None.
