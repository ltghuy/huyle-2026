---
id: "018"
feature: networking-handbook
audited: 2026-10-08
result: passed
---

# Audit: Networking Handbook

Evidence comes from a production build (`pnpm build && pnpm start -p 3123`):
- `curl` against the API routes;
- Node scripts (`--experimental-strip-types`) on the three models;
- a Puppeteer script in headless Chrome: real clicks and typing, axe-core 4.10.2 in both themes, and a 360 px viewport.

Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: One click from sidebar, home, section page | Met | The sidebar lists `/browser-platform` and `/browser-platform/networking`. The home card links to the section ("1 of 1 page written"). The section page has the Networking card. `/browser-platform/nope` gives 404. The Performance & Accessibility pages still render with the same breadcrumbs, and their home card still shows "2 of 2 pages written" |
| G2: Six short topics, each demo reacts | Met | 1,258 words of prose outside the demos. Every topic has an intro, 4–5 points, a demo, Do/Avoid and reference links (every URL checked to return 200). Results in SC1 |
| G3: Real requests show what came back; models labelled | Met | The HTTP and caching demos hit `/api/handbook/*`, and the server's echo and log appear in the results. The journey, slow-start and version demos are labelled "simulated". The protocol and secure-context facts are read from the browser |
| SC1: Every demo reacts | Met | Table below |
| SC2: ~10-minute read (< ~1,600 words) | Met | 1,258 words |
| SC3: 0 serious/critical axe both themes; no sideways scroll at 360 px | Met | Only the moderate `region` finding from the shell (feature 001) remains. `scrollWidth` is 360 for the section page and the Networking page in both themes |

## SC1 demo results

| Demo | Result |
|------|--------|
| Journey (100 ms RTT) | TLS 1.2: 5 RTT, 550 ms → TLS 1.3: 4, 450 ms → HTTP/3: 3, 350 ms → reused connection: 1, 150 ms |
| Slow start (500 KB) | 351 segments; no loss 7 round trips (0.7 s), one loss 10 (1.0 s), ~0.7% loss 11 (1.1 s); 2 MB: 9 / 30 / 83 |
| HTTP messages | POST + 201: the server echo shows the method, path, `content-type: application/json` and the body; 404 explained as 4xx; 301 followed to `…?status=200&redirectedFrom=301`, and the script sees the final 200 (as a GET); 204 has no body; invalid JSON is blocked before sending |
| Caching | no-store: two full downloads (server saw 1, 2). max-age: the second fetch came from the browser cache (0 B, server still at 1). no-cache + ETag: the second fetch was revalidated (server logged a 304, 300 B of headers, the script saw 200) |
| Versions | HTTP/1.1 400 ms (loss: 500, 1 file stalled); HTTP/2 300 ms (loss: 400, all 12 stalled); HTTP/3 200 ms (loss: 300, 1 stalled). Real: "This page: http/1.1", 94 files over http/1.1 |
| HTTPS | HTTP: everything readable. HTTPS: IP addresses, host name, sizes readable; path, headers, cookie and body encrypted. Real: "Loaded over http; secure context: yes (localhost counts as secure…)" |

## Known minor issues (not blocking)

- Locally the page arrives over HTTP/1.1, so the "real protocol" line only shows `h2`/`h3` when deployed behind a server or CDN that speaks them.
- `curl` and route checks found no issue. The two console 404s in the test run are the demo's deliberate 404 request and the unknown-address check.
