---
id: "038"
feature: ab-testing
created: 2026-10-21
---

# Technical Design: A/B testing

## Scope

In: the page `/testing/ab-testing` with five topics, a live experiment on
that page (server-side assignment from a cookie, no flicker), the statistics
demos, an end-to-end test that pins each variant, and removing the Testing
section's fallback route once every page is written.
Out: storing anything about visitors on the server, third-party flag services.

## Research Summary

- Next 16 `cookies()` (bundled docs `04-functions/cookies.md`): async, readable in Server Components, writable only in Server Functions and Route Handlers; reading it makes the route dynamic. The project doesn't use Cache Components, so no Suspense boundary is required.
- A proxy (middleware) could set the cookie on the first response, but the earlier Vary-normalising proxy was reverted on Cloudflare (knowledge.md); this page avoids a proxy.
- Statistics follow the standard two-proportion z-test: sample size n = (z₁₋α/₂·√(2p̄(1−p̄)) + z₁₋β·√(p₁(1−p₁)+p₂(1−p₂)))² / (p₂−p₁)²; Wilson intervals per arm; sample ratio mismatch by a chi-square goodness-of-fit test (df = arms − 1).

## Decisions

| Decision | Rationale |
|----------|-----------|
| The page reads `rp-ab-id` with `cookies()`. With no cookie, the server makes an anonymous id, renders that visitor's variant, and the browser stores the id in a cookie after hydration | The first HTML already has the variant (no flicker) and later visits keep it, without a proxy |
| Assignment = FNV-1a hash of `experiment:id` modulo 10,000 buckets; variant A when bucket < split × 100 | Deterministic, the same in Node and the browser, explainable with real numbers on the page |
| An `rp-ab-force` cookie pins a variant | How QA and end-to-end tests see a chosen variant (AC-016) |
| Exposure and conversion events are kept in the page's memory for this visitor and shown as the payloads that would be sent | The site stores nothing about visitors (spec Notes) |
| The flicker comparison uses two sandboxed `srcdoc` frames: one fetches its flag after a delay, the other has the variant in its HTML | A real flash of the wrong variant, contained in a frame |
| Statistics demos draw real random visitors in the browser, chunked with `setTimeout` and cancellable | Responsive for large runs (edge case) |
| Peeking: the same simulated A/A data is judged two ways (stop at the first significant daily check, or test once at the planned end) | A fair comparison of the two decision rules |
| A day-by-day table instead of a chart | Exact numbers, accessible, no chart library |
| Remove `testing/[slug]` after this page ships | Every Testing page has its own route (knowledge: delete the fallback once all pages are written) |

## Component Design

| Component | File | Action |
|-----------|------|--------|
| Assignment | src/handbook/ab/assign.ts | new: cookie names, experiment, hash, bucket, variant |
| Statistics | src/handbook/ab/stats.ts | new: erf, normal CDF and quantile, sample size, z-test, Wilson, chi-square, binomial draws |
| PlanDemo | src/handbook/ab/plan-demo.tsx | new (AC-002) |
| LiveExperiment | src/handbook/ab/live-experiment.tsx | new (AC-003 to AC-006) |
| FlickerDemo | src/handbook/ab/flicker-demo.tsx | new (AC-007) |
| SpreadDemo | src/handbook/ab/spread-demo.tsx | new (AC-008) |
| SampleSizeDemo | src/handbook/ab/sample-size-demo.tsx | new (AC-009 to AC-011) |
| PeekingDemo | src/handbook/ab/peeking-demo.tsx | new (AC-012, AC-013) |
| SrmDemo | src/handbook/ab/srm-demo.tsx | new (AC-014) |
| Content | src/handbook/ab/content.tsx | new (topics, AC-015, AC-017, quotes the e2e test) |
| Route | src/app/(playground)/testing/ab-testing/page.tsx | new: reads cookies, assigns |
| Fallback route | src/app/(playground)/testing/[slug]/page.tsx | delete |
| E2E | e2e/pages/ab-testing.page.ts, e2e/specs/ab-testing.spec.ts | new (AC-016) |
| Catalog, README | | modify |

## Requirements Traceability

| Requirement | Where |
|-------------|-------|
| AC-001 | catalog.ts, route |
| AC-002 | plan-demo.tsx |
| AC-003 to AC-006 | route page.tsx, assign.ts, live-experiment.tsx |
| AC-007 | flicker-demo.tsx |
| AC-008 | spread-demo.tsx |
| AC-009 to AC-011 | stats.ts, sample-size-demo.tsx |
| AC-012, AC-013 | peeking-demo.tsx |
| AC-014, AC-015 | srm-demo.tsx, content.tsx |
| AC-016 | e2e/specs/ab-testing.spec.ts, content.tsx |
| AC-017 | content.tsx |

## Test Strategy

`pnpm test:e2e` (new spec), statistics checked by script against known values (sample size for 5% → 5.5% at α 0.05, power 0.8 ≈ 31,200 per arm; A/A false positive rate ≈ α without peeking), browser checks of every demo, axe in both themes, 360 px, `pnpm typecheck && pnpm lint && pnpm build`.

## Considerations

- Cookie blocked: the page still shows the server's variant and says it can't stay the same next time.
- The page becomes dynamic (rendered per request); the rest of the site stays prerendered.
- No `localStorage` for events; nothing leaves the browser.

## Open Questions

- None
