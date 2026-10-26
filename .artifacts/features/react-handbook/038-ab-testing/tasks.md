---
id: "038"
feature: ab-testing
created: 2026-10-21
---

# Tasks: A/B testing

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Tasks

- [x] T001 Assignment and statistics modules, checked by script against known values
  - **Done when:** sample size 5% → 5.5% is about 31,200 per arm; A/A false positives near α; 100,000 ids split near 50/50
- [x] T002 [B:T001] Route that reads the cookie and assigns on the server; live experiment with exposure and conversion events, reset and what-if split
  - **Done when:** a new visitor gets an id cookie, a reload keeps id and variant, the first HTML holds the variant
- [x] T003 [B:T001] Plan, flicker, spread, sample size, peeking and SRM demos
  - **Done when:** each demo's output changes with its input and bad inputs explain themselves
- [x] T004 [B:T002] End-to-end tests that pin each variant and check a returning visitor
  - **Done when:** the suite passes three runs in a row
- [x] T005 [B:T003,T004] Content, catalog, README; remove the Testing fallback route
  - **Done when:** the build lists the page as dynamic and the other Testing pages as static
- [x] T006 [B:T005] Verify: browser script, axe in both themes, 360 px, sources
  - **Done when:** every AC is proven and marked
