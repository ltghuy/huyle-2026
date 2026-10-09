---
id: "019"
feature: origins-and-cors
audited: 2026-10-08
result: passed
---

# Audit: Origins, DNS and CORS

Evidence comes from a production build (`pnpm build && pnpm start -p 3123`):
- `curl` against the routes;
- Node scripts on the two models;
- Puppeteer scripts in headless Chrome: real clicks and typing, real cross-origin requests from the sandboxed iframe, axe-core 4.10.2 in both themes, and a 360 px viewport.

Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Reachable; Networking links to it | Met | The sidebar and the section page list it, and the section page shows "2 of 2 pages written". The Networking page has a link to `/browser-platform/origins-and-cors` in its DNS point |
| G2: Four short topics, each demo reacts | Met | 896 words of prose outside the demos. Every topic has an intro, 4 points, a demo, Do/Avoid and links (every URL checked to return 200) |
| G3: Real DNS and CORS results, simplifications labelled | Met | DNS records come from this server's resolver, with TTLs. CORS outcomes come from the browser, alongside the server's own log. "Site" and the resolver chain are labelled simplified / illustration |
| SC1: Demos react | Met | Table below |
| SC2: < ~1,300 words | Met | 896 |
| SC3: axe both themes, 360 px | Met | Only the moderate `region` finding from the shell remains. `scrollWidth` is 360 in both themes |

## SC1 demo results

| Demo | Result |
|------|--------|
| URL | `http://a.example:8080/p?q=1#f` → scheme http, hostname a.example, port 8080, host a.example:8080, path /p, query q = 1, fragment f (never sent), origin `http://a.example:8080`, site `http://a.example`. `example.com` → "has no scheme…" |
| DNS | `example.com A` → 2 records with TTL 145 s in 7 ms. `www.github.com CNAME` → github.com. `gmail.com MX` → 5 gmail-smtp-in…. `no-such-name.example` → NXDOMAIN (404). `bad_name` → 422 before any lookup |
| Origins | app.example.com vs api.example.com: cross-origin (host), same site. https vs http: cross-origin (scheme), cross-site. ada.github.io vs grace.github.io: cross-site (github.io is a public suffix) |
| CORS | 1. JSON POST, no CORS headers: stopped at the preflight; only OPTIONS was logged.<br>2. Caller's origin allowed but not the headers: stopped at the preflight.<br>3. Headers allowed too: OPTIONS then POST, and the page read 200.<br>4. Simple POST with `*`: no preflight, read.<br>5. `*` with credentials: blocked, but the POST reached the server.<br>6. Credentials with the caller's origin: read.<br>7. PUT not allowed: stopped at the preflight.<br>8. PUT allowed: OPTIONS then PUT, read.<br>Also, a simple POST with no CORS headers: blocked, and "the request still reached the server" (POST logged) |

## Known minor issues (not blocking)

- Blocked requests print a CORS error in the browser console; the demo says this is expected.
- The site calculation uses a short list of public suffixes, as the page states.
