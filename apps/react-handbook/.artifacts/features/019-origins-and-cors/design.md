---
id: "019"
feature: origins-and-cors
created: 2026-10-08
---

# Technical Design: Origins, DNS and CORS

## Scope

In: a catalog entry and route for the page, four topics with four demos, two
API areas (DNS lookup, CORS lab with a log), a link from the Networking page.
Out: other security topics, new dependencies.

## Research Summary

- The WHATWG `URL` parser gives `protocol`, `username`, `password`, `hostname`, `port` ("" for the scheme's default), `host`, `pathname`, `searchParams`, `hash`, `origin` (`"null"` for opaque schemes).
- Origin = scheme + host + port; site = scheme + registrable domain (eTLD+1 from the Public Suffix List); `SameSite` cookies and some isolation features use site, the same-origin policy uses origin.
- Node `dns/promises` `Resolver`: `resolve4/resolve6({ ttl: true })` return TTLs; `resolveCname`, `resolveMx`, `resolveTxt`, `resolveNs` don't; errors `ENOTFOUND` (no such name) and `ENODATA` (no record of that type).
- CORS (Fetch standard): a request is "simple" (no preflight) for GET/HEAD/POST with only safelisted headers and a `Content-Type` of `text/plain`, `application/x-www-form-urlencoded` or `multipart/form-data`; otherwise an `OPTIONS` preflight with `Access-Control-Request-Method/-Headers` must be answered with matching `Access-Control-Allow-Origin/-Methods/-Headers` (and `-Credentials: true` when credentials are included; `*` is not allowed then). Safelisted methods (GET, HEAD, POST) pass a preflight even if not listed. Blocked responses still reached the server. Preflight results are cached per URL; a unique URL per send avoids that.
- A sandboxed iframe without `allow-same-origin` has an opaque origin: its requests carry `Origin: null` and are cross-origin to this site; it can talk to the page only with `postMessage` (target `"*"`, check `event.source`).

## Patterns & Reuse

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Handbook page | catalog entry + route + `src/handbook/{slug}/content.tsx`, `Topic`/`Toc`, `linksLabel="Read more:"` | `src/handbook/networking/content.tsx` |
| API | thin routes → `src/server/handbook/*.service.ts`, Zod schemas | `src/app/api/handbook/cache/route.ts` |
| Per-run log on `globalThis` | capped map of runs | `src/server/handbook/cache-lab.service.ts` |
| Shared demo UI | `Toggle`, `Verdict` | `src/handbook/ui.tsx` |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | `src/practices/catalog.ts` | modify | `origins-and-cors` page in browser-platform |
| page route | `src/app/(playground)/browser-platform/origins-and-cors/page.tsx` | new | renders the handbook |
| url model | `src/handbook/origins/url-parts.ts` | new | `dissect(input)`, `siteOf(url)`, `compareOrigins(a, b)` |
| UrlDemo | `src/handbook/origins/url-demo.tsx` | new (client) | input + parts table |
| DnsDemo | `src/handbook/origins/dns-demo.tsx` | new (client) | name + type → real records, resolver chain |
| OriginDemo | `src/handbook/origins/origin-demo.tsx` | new (client) | two URLs / presets → verdicts + what's allowed |
| cors model | `src/handbook/origins/cors-rules.ts` | new | `needsPreflight`, `explain(request, policy)` |
| CorsDemo | `src/handbook/origins/cors-demo.tsx` | new (client) | request + policy controls, sandboxed iframe sender, result + server log |
| content | `src/handbook/origins/content.tsx` | new | intro, TOC, four topics |
| dns schema/service | `src/server/handbook/dns.{schema,service}.ts` | new | validate name/type; lookup with 3 s timeout |
| cors schema/service | `src/server/handbook/cors-lab.{schema,service}.ts` | new | policy from query; preflight/actual responses; log |
| routes | `src/app/api/handbook/dns/route.ts`, `.../cors/route.ts` (OPTIONS, GET, POST, PUT), `.../cors/log/route.ts` | new | thin adapters |
| Networking content | `src/handbook/networking/content.tsx` | modify | link from the DNS point |

## API Contracts

- `GET /api/handbook/dns?name=&type=A|AAAA|CNAME|MX|TXT|NS` → `{ data: { name, type, records: { value, ttl? }[], ms } }`; not found → 404 `{ error }`, no data → 200 with `records: []` and `reason: "no-data"`.
- `OPTIONS|GET|POST|PUT /api/handbook/cors?run=&n=&allow=none|any|origin&put=0|1&header=0|1&credentials=0|1` → CORS headers per policy (preflight: 204), body `{ data: { method } }`; every request logged.
- `GET /api/handbook/cors/log?run=` → `{ data: { entries: { n, method, origin, preflight, requestMethod?, requestHeaders?, allowed } [] } }`.

## Data Flow

1. CorsDemo mounts a sandboxed `srcdoc` iframe whose script waits for `{ id, url, init }` messages, runs `fetch`, and posts back `{ id, ok, status, body }` or `{ id, error }`. The iframe says `{ ready }` on load and again when pinged: it can load before hydration attaches the page's listener, so the page pings it once it listens.
2. Send → unique `n` → message to the iframe → result → `GET …/cors/log?run=` → rows for that `n` → explanation from `explain()` next to the real outcome.

## Requirements Traceability

| Requirement | Component | Status |
|-------------|-----------|--------|
| AC-001 | catalog, route, content, Networking link | Done |
| AC-002 | url-parts, UrlDemo | Done |
| AC-003, AC-004 | DnsDemo, dns service/route | Done |
| AC-005 | url-parts, OriginDemo | Done |
| AC-006, AC-007 | cors-rules, CorsDemo, cors-lab service/routes | Done |
| AC-008 | content | Done |

## Test Strategy

- Node script on `url-parts` and `cors-rules`; curl on the routes (preflight headers, log); Puppeteer: each demo, CORS matrix (blocked-but-logged, allowed with preflight, `*` + credentials), axe both themes, 360 px.

## Considerations

- Security: DNS names validated (letters, digits, hyphens, dots, ≤ 253 chars), lookups time out after 3 s, only record data is returned. The CORS lab allows `null` only for its own demo routes. Logs capped at 200 runs.
