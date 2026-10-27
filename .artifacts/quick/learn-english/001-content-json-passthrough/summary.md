---
slug: content-json-passthrough
completed: 2026-10-27
---

# Summary: Serve content bodies without decoding them, and publish chosen levels only

## What Changed

`getContentItems` now selects each body as raw text and builds the response JSON by inserting the stored body text, instead of letting Drizzle's JSON column mode parse every body and the route serialize them again. Clients get the same JSON shape. On a laptop, building the B1 sentence response (4,926 items, 3.6 MB) dropped from 13.4 ms to 1.8 ms, and B2's (5,578 items) from 16.1 ms to 2.3 ms, so a cache miss stays inside the Workers free plan's 10 ms CPU. Checked against the local D1 through `next dev`: all 1,411 A2 words matched the source files. `content:publish` gained `--levels`, which publishes only the listed levels and never tombstones rows of other levels, so B1 can go live while B2 is held back.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/server/content/content.service.ts` | Raw body select; returns `{ version, json }` built by string assembly |
| `apps/learn-english/src/app/api/content/items/route.ts` | Sends the prebuilt JSON |
| `apps/learn-english/src/server/content/content.service.test.ts` | Parses the JSON; new passthrough test (escapes, Vietnamese text) |
| `apps/learn-english/src/app/api/content/items/route.test.ts` | Mocks the new payload |
| `apps/learn-english/scripts/publish-content.ts` | `--levels`; level-scoped tombstones |
| `apps/learn-english/scripts/publish-content.test.ts` | Test for level-scoped tombstones |

## Patterns Discovered

Drizzle `text(..., { mode: "json" })` parses on every read; select `sql<string>\`${column}\`` to get the raw text when the value is only passed through.

## Follow-Up

The app must be redeployed before B1 is published, so production uses the new service. The D1 binding still decodes the result rows (about 3.6 MB for B1 sentences); if misses still fail on the free plan, split large lists into pages.
