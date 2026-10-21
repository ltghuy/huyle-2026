---
id: "038"
feature: ab-testing
created: 2026-10-21
---

# Audit: A/B testing

## Goals

- [x] A new visitor gets an anonymous id from the server, which renders their variant in the first HTML (checked: the HTML fetched with that id contains the variant's button text); the browser stores the id in a cookie and a reload shows the same id and variant. The browser-assigned comparison frame paints "Add to cart" first and switches to "Buy now" after its flag request; the server-assigned frame shows "Buy now" from the start.
- [x] The sample size for a 5% baseline and a 10% relative lift at 5% significance and 80% power is 31,234 per variant (textbook value about 31,200), with the days at the chosen traffic; a batch of 200 A/A experiments over 28 days falsely declared a winner 24.5% of the time with daily peeking and 4.0% when tested once, against 5% promised.
- [x] Five topics, each with a demo whose output changes with input: the plan checker; the live experiment with the flicker and spread demos; sample size with a day-by-day simulation; peeking; the sample ratio check with the quoted end-to-end test.

## Success Criteria

- [x] Ten reloads keep the same variant (the end-to-end test checks a reload; the browser script checked id and variant across reloads), and the first paint already shows it.
- [x] 10,000 generated ids split 50.14/49.86 and 49.76/50.24 in two runs; 100,000 by script 49.90/50.10: within one percentage point.
- [x] A/A without peeking: 4.0% (page) and 4.5% (2,000 by script) against 5%; with daily peeking 24.5%.
- [x] axe: no violations in dark or light; no horizontal overflow at 360 px; no console errors.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass; `pnpm test:e2e` passes 24 tests three runs in a row with no retries.

## Notes

- The page reads cookies, so it is the only Testing page rendered per request (ƒ in the build); no proxy is involved.
- Two first-draft source links returned 404 and were replaced (Kohavi's guide, Fowler's feature toggles); all 10 links answer 200, and the two papers are served as PDFs.
- The Testing section's fallback route was removed now that every page has its own route.
- A bad input (zero daily traffic) shows an explanation instead of a number.
