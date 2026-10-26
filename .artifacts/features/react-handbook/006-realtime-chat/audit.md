---
id: "006"
feature: realtime-chat
audited: 2026-10-07
result: passed
---

# Audit: Real-Time Chat UI

Evidence from the T015 and T017 measurements on a production build (`next build && next start`) in headless Chrome, recorded in tasks.md "Verification Notes", plus the user's manual check of the finished practice. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Every message in every tab exactly once, same order | Met | See SC1; 10 disconnect runs with 0 missing / 0 duplicates; typed order kept by the serial outbox (15/15, client = server) |
| G2: Own messages instant; failed sends marked, retryable or discardable without losing text | Met | See SC3; at 100% failure, failed messages show "Not sent … Retry / Discard", Retry delivers once, failed/pending messages survive a reload |
| G3: Dropped connection recovers on its own and fills the gap with no duplicates | Met | See SC2; backoff 0.3 → 5.8 s over 5 drops; online → Live in 11 ms; replay past the 500 window falls back to a reset with a "may be missing" marker |
| G4: View follows only at the bottom; reading is never interrupted | Met | See SC4 and SC5; scrolled up, others' messages don't move the view; own send always scrolls to the bottom |
| G5: Every failure mode reachable from the demo controls | Met | Latency, send/history failure, simulated people off/normal, Burst, Drop connection, Go offline, Open another tab, Clear conversation; all exercised through the UI |
| SC1: Two tabs, 2 min, identical sequence | Met | 82 overlapping messages, identical seq sequences, unique and sorted, own messages per tab only (10 / 7) |
| SC2: 10 disconnects of 3–10 s, 0 missing or duplicated, 10/10 | Met | 10/10 runs: 0 missing, 0 duplicates (gaps 4.7–10.0 s, 130 posted, 108 replayed) |
| SC3: Optimistic message within one frame at any latency | Met | 5/5 latency settings on the next animation frame; 15/15 in the ordering run |
| SC4: 5 older pages, anchored message moves ≤ 1 px | Met | 0 px on every load |
| SC5: 50-message burst scrolled up: 0 px, no long task > 50 ms | Met | 0 px movement, 0 long tasks |
| SC6: 0 serious/critical a11y issues, light + dark | Met | axe-core 4.10.2: 0 serious, 0 critical in both themes (also after adding Clear conversation); 1 moderate `region` (pre-existing from 001) |

## Known minor issues (not blocking)

- Verified by code inspection only: 35 s stall timeout, 15 s send timeout, out-of-order stream insertion, late confirmation for a discarded in-flight message.
- Unsent messages are kept per browser, so two tabs of the same browser both restore them; whichever retries first wins and the other confirms it from the stream echo.
- Only the most recent clear is remembered by the server: a tab that missed two clears gets one notification for both.
- axe `region` (moderate) carried over from feature 001.
