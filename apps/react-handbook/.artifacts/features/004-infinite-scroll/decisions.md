---
id: "004"
feature: infinite-scroll
created: 2026-10-06
---

# Decisions: Infinite Scroll

## Resolved

### Trigger

- **Decision:** Automatic loading when nearing the end (hand-built observer of an end-of-list marker, trigger distance adjustable), plus an always-visible "Load more" button.
- **Rationale:** Automatic for the common case; an explicit control for keyboard users, error recovery, and reaching content after the feed.

### Scroll container

- **Decision:** The feed scrolls inside a fixed-height box in the demo area.
- **Rationale:** Keeps the explanation and controls in view; exercises observing a custom scroll container.

### Paging model

- **Decision:** A finite feed of about 500 generated posts, paged by an opaque position marker from the server (cursor), with an explicit end state.
- **Rationale:** Cursor paging is immune to the duplicate/skip bug that page numbers have when data changes; a finite feed makes the end state testable.

### Extras

- **Decision:** Scroll restoration (in-app navigation only), "N new posts" pill, screen reader announcements with the feed pattern, Back to top.

### Restoration scope

- **Decision:** Restore loaded posts and scroll position when returning via in-app navigation or Back; a full reload starts fresh.
- **Rationale:** Covers the classic SPA problem without storage-staleness concerns.

### New posts

- **Decision:** Check for newer posts every 10 seconds (adjustable, paused while the tab is hidden), plus a "Simulate new posts" control that creates 3 posts on the server.
- **Rationale:** Realistic polling behavior with an on-demand way to trigger it.

## Tentative

### Error behavior during automatic loading

- **Tentative Decision:** After a failed page, automatic loading pauses until the reader presses Retry.
- **Revisit when:** A gentle automatic retry with backoff seems more natural in use.
