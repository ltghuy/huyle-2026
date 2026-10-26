---
id: "004"
feature: infinite-scroll
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-06
---

# Feature: Infinite Scroll

## Overview

Practice 3 of the playground. The learner wants to build, from scratch, the
feed pattern used by social and news apps: as the reader nears the end of
the list, the next page loads on its own; new posts can arrive at the top
without yanking the reading position; and leaving and coming back doesn't
throw away everything that was loaded. It's a good exercise because naive
infinite scroll fails in well-known ways (duplicate requests, duplicated or
skipped items when data changes, lost position on Back, inaccessible
"bottomless" lists), and each one has a concrete fix.

The feed scrolls inside its own box on the practice page and pages through
about 500 posts from the project's mock endpoint, using a position marker
from the server (not page numbers), so items added in the meantime never
cause duplicates or gaps. Cross-practice rules from feature 001 apply (core
logic hand-built, explanation panel + demo controls).

## Goals

- [x] Reading the whole feed requires no clicks: the next page is already loading before the reader reaches the end.
- [x] Every post appears exactly once, in order, even when new posts arrive while the reader is scrolling.
- [x] The reading position never jumps on its own: not when a page loads, not when new posts arrive, not when coming back to the practice.
- [x] Keyboard and screen reader users can read, load more, and know when loading and the end happen.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rendering only the visible rows (windowing) | Practice 7 (Virtualized Large Lists) |
| Loading older items above (two-way scrolling) | Practice 5 (Real-Time Chat) covers it |
| Images in posts | Practice 11 (Lazy-Loaded Images) |
| Restoring the feed after a full browser reload | Restoration is for in-app navigation only |
| Real-time push of new posts | Polling is the chosen mechanism; push belongs to the chat practice |
| Editing, liking or deleting posts | The feed is read-only |

## User Stories

### P1: Load the next page while scrolling

- As a reader, I want more posts to load as I approach the end so that I can keep reading without interruptions.
- **Why P1:** This is the practice.
- **Independent Test:** Scroll the feed steadily; confirm new posts keep appearing before the end is reached, a loading row shows while a page is on its way, and after about 500 posts "You've reached the end" appears and no further requests are made.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL load the first page into a fixed-height, independently scrolling feed box, showing placeholder rows while it loads.
- [x] AC-002: WHEN the reader scrolls to within the trigger distance of the end (default 400 px) THEN system SHALL request the next page and show a loading row at the end of the list.
- [x] AC-003: WHEN a page arrives THEN system SHALL append its posts after the existing ones without changing what the reader is looking at.
- [x] AC-004: WHEN a page is already loading THEN system SHALL NOT start another request, however fast the reader scrolls.
- [x] AC-005: WHEN the loaded posts don't fill the feed box THEN system SHALL keep loading pages until the box can scroll or the feed ends.
- [x] AC-006: WHEN the server reports there are no more posts THEN system SHALL show "You've reached the end · N posts" and make no further page requests.
- [x] AC-007: WHEN the reader leaves the practice while a page is loading THEN system SHALL cancel that request.

### P1: Explicit "Load more" and errors

- As a reader, I want a visible "Load more" button and clear error recovery so that I'm never stuck when automatic loading can't help.
- **Why P1:** Automatic loading alone fails keyboard users, users who want to reach content after the feed, and anyone hitting a network error.
- **Independent Test:** Tab to the "Load more" button and press Enter: the next page loads. Set the failure rate to 100% and scroll: an error row with Retry appears, loaded posts stay, and Retry (after lowering the failure rate) continues from the same place.

**Acceptance Criteria:**

- [x] AC-008: WHEN more posts are available THEN system SHALL show a "Load more" button at the end of the list that loads the next page when activated.
- [x] AC-009: WHEN a page fails to load THEN system SHALL keep every loaded post, show an error row with the reason and a Retry button, and stop automatic loading until the reader retries.
- [x] AC-010: WHEN the reader retries THEN system SHALL request the same page again, so no posts are skipped or repeated.
- [x] AC-011: WHEN the first page fails THEN system SHALL show the error with Retry in place of the feed.

### P1: Accessible feed

- As a screen reader or keyboard user, I want the feed to be navigable post by post and to be told what's happening so that I can use it like everyone else.
- **Why P1:** "Bottomless" lists are a classic accessibility failure; the practice must show the fix.
- **Independent Test:** With a screen reader, confirm each post is announced as an article with its position ("3 of 60"); load a page and hear "Loaded 20 more posts, 80 total"; reach the end and hear "End of feed".

**Acceptance Criteria:**

- [x] AC-012: WHEN the feed is shown THEN system SHALL expose it as a feed of articles, each labelled by its author and with its position in the loaded set and the total once known.
- [x] AC-013: WHEN a page is loading THEN system SHALL mark the feed as busy, and clear it when loading ends.
- [x] AC-014: WHEN a page loads, fails, or the end is reached THEN system SHALL announce it politely ("Loaded 20 more posts, 80 total", "Couldn't load more posts", "End of feed, 500 posts").
- [x] AC-015: WHEN focus is on a post and the reader presses Page Down or Page Up THEN system SHALL move focus to the next or previous post, scrolling it into view.
- [x] AC-016: WHEN a page loads THEN system SHALL NOT move keyboard focus.

### P2: Come back to where you were

- As a reader, I want to leave the practice and return to find my posts and scroll position intact so that I don't lose my place.
- **Why P2:** A top complaint about infinite feeds, but the feed works without it.

**Acceptance Criteria:**

- [x] AC-017: WHEN the reader navigates to another page inside the playground and comes back (via the sidebar or browser Back) THEN system SHALL show the same loaded posts and the same scroll position, without refetching them.
- [x] AC-018: WHEN the feed is restored THEN system SHALL continue loading from where it stopped and keep counting new posts from where it stopped.
- [x] AC-019: WHEN the browser page is fully reloaded THEN system SHALL start a fresh feed.

### P2: New posts arrive at the top

- As a reader deep in the feed, I want to be told about new posts instead of having them pushed in above me so that my reading position stays put.
- **Why P2:** Shows the "don't move content under the reader" principle on top of the core feed.

**Acceptance Criteria:**

- [x] AC-020: WHILE the feed is visible THEN system SHALL check for newer posts every 10 seconds (adjustable in demo controls) and SHALL pause checking while the browser tab is hidden.
- [x] AC-021: WHEN newer posts exist THEN system SHALL show an "N new posts" pill at the top of the feed box, without inserting them yet.
- [x] AC-022: WHEN the reader activates the pill THEN system SHALL insert the new posts at the top, scroll the feed to the top, and announce "N new posts shown".
- [x] AC-023: WHEN the demo's "Simulate new posts" control is used THEN the server SHALL create 3 new posts so the next check finds them.
- [x] AC-024: WHEN new posts exist on the server THEN paging further down SHALL still return each older post exactly once.

### P2: Back to top

- As a reader far down the feed, I want a quick way back to the top.
- **Why P2:** Convenience.

**Acceptance Criteria:**

- [x] AC-025: WHEN the feed is scrolled more than two box heights down THEN system SHALL show a "Back to top" button; activating it SHALL scroll to the top (smoothly, or instantly with reduced motion) and move focus to the first post.

### P2: Demo controls

- As a learner, I want to tune the feed so that I can watch each failure mode and its fix.
- **Why P2:** Makes the practice explorable.

**Acceptance Criteria:**

- [x] AC-026: WHEN the learner changes latency (0–3000 ms), failure rate (0–100%), page size (10, 20 or 50), trigger distance (0, 400 or 1200 px), or check interval (5–60 s) THEN system SHALL apply it to the next request or check.
- [x] AC-027: WHEN the learner chooses "Reset feed" THEN system SHALL discard loaded posts and restoration data and load the first page again.
- [x] AC-028: WHEN the demo shows request activity THEN system SHALL display the number of page requests made and the number of posts loaded, so duplicate requests would be visible.

## Edge Cases

- WHEN the page size is changed mid-feed THEN system SHALL continue from the last loaded post with the new size, without duplicates or gaps.
- WHEN the reader scrolls back up while a page is loading THEN system SHALL still append the page when it arrives and keep the position.
- WHEN new posts are inserted via the pill while a page is loading below THEN system SHALL still append that page correctly.
- WHEN more than 99 new posts are waiting THEN the pill SHALL read "99+ new posts".
- WHEN the trigger distance is 0 THEN loading SHALL start only when the end of the list is actually visible.
- WHEN a check for new posts fails THEN system SHALL try again at the next interval without showing an error.
- WHEN the feed box is resized (window resize, mobile rotation) THEN loading SHALL still trigger correctly.
- WHEN the reader prefers reduced motion THEN scrolling to the top SHALL be instant.

## Success Criteria

- [x] Scrolling through all ~500 posts produces exactly one request per page (request count = pages loaded), zero duplicate posts and zero gaps, including while new posts are added mid-scroll.
- [x] Appending a page causes no main-thread task over 50 ms and no visible jump in reading position (the first visible post stays within 1 px).
- [x] Returning to the practice after visiting another one restores the scroll position to within 1 post of where it was, with zero page requests.
- [x] Zero serious or critical issues in an automated accessibility audit of the feed with posts loaded.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation panel should cover: observing a sentinel instead of listening to scroll events, why one request at a time, cursor vs page-number paging (and the duplicate/skip bug it prevents), the feed pattern for accessibility, keeping position stable by never inserting above the reader uninvited, and restoring state on return.
