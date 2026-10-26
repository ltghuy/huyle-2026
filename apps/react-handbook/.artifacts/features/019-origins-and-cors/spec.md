---
id: "019"
feature: origins-and-cors
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-08
---

# Feature: Origins, DNS and CORS

## Overview

The Networking page (feature 018) explains how a request travels, but not
who a request is *from* in the browser's eyes. Learners keep meeting the same
words without a clear model: host, domain, DNS record, origin, site, and the
CORS error in the console. This feature adds a second Browser & Web Platform
page, **Origins, DNS and CORS**: the parts of a URL, how DNS turns a host
into an address, what an origin and a site are and what the same-origin
policy blocks, and how CORS lets a server opt in. Short notes, each with a
live demo; DNS lookups and cross-origin requests are real.

## Goals

- [x] The page can be opened in one click from the sidebar, the home page and the section page, and the Networking page links to it.
- [x] Each of the four topics fits on one screen of reading and has a demo whose result changes with the learner's input.
- [x] The DNS and CORS demos show real results (records the server's resolver returned; what the browser really allowed, and what the server really received), with simplifications labelled.

## Out of Scope

| Feature | Reason |
|---------|--------|
| XSS, CSP, CSRF in depth | A later security page; cookies' SameSite gets one point here |
| Running a DNS resolver in the browser or calling third-party DNS services | Lookups run on this site's server |
| Every CORS header (expose-headers, private network access) | Main ones only; links cover the rest |

## User Stories

### P1: Reach the page

**Acceptance Criteria:**

- [x] AC-001: WHEN the sidebar, the Browser & Web Platform section page or the home card is shown THEN the new page SHALL be listed as written and counted (2 of 2); the page SHALL show breadcrumbs, title, intro and a topic list; the Networking page SHALL link to it from its DNS point.

### P1: URLs and hosts

- As a learner, I want to paste a URL and see its parts named so that host, hostname, port, domain and origin stop being interchangeable words.

**Acceptance Criteria:**

- [x] AC-002: WHEN the learner types a URL THEN system SHALL show its scheme, username/password if any, hostname, port (and the default port when none is written), path, query parameters, fragment, the host, the origin and the site, as the browser parses them; WHEN the URL can't be parsed THEN system SHALL say why without breaking. The site SHALL be labelled as simplified (a short built-in list of public suffixes).

### P1: DNS

- As a learner, I want to look up a real host name and see its records, so that A, AAAA, CNAME, MX, TXT and TTL mean something.

**Acceptance Criteria:**

- [x] AC-003: WHEN the learner looks up a host name and a record type THEN system SHALL show the records this site's server received from its resolver (with TTL where the type has one) and how long the lookup took; WHEN the name doesn't exist or has no such record THEN system SHALL say so in words; invalid names SHALL be rejected before any lookup.
- [x] AC-004: WHEN a lookup is shown THEN system SHALL also show, as a simplified illustration, the chain a resolver walks for that name (root, top-level domain, the domain's name servers) and which caches can answer first.

### P1: Origins and the same-origin policy

- As a learner, I want to compare two URLs and see whether they are the same origin and the same site, and what that allows.

**Acceptance Criteria:**

- [x] AC-005: WHEN the learner enters two URLs or picks a preset pair THEN system SHALL say whether they are same-origin and same-site, name the part that differs (scheme, host, port), and list what that allows (reading responses with fetch, accessing another window's DOM, sending SameSite=Strict/Lax cookies).

### P1: CORS

- As a learner, I want to send a real cross-origin request, change what the server allows, and see what the browser lets the page read and what reached the server.

**Acceptance Criteria:**

- [x] AC-006: WHEN the learner sends a request from a different origin (method, content type, a custom header, credentials) under a chosen server policy (allowed origin none / * / that origin, allowed methods and headers, allow credentials) THEN system SHALL show whether the page could read the response, and the server's own log of the requests it received, including any preflight OPTIONS request.
- [x] AC-007: WHEN a request is blocked THEN system SHALL say why in words (no Access-Control-Allow-Origin, preflight not allowed for the method or header, `*` with credentials) and point out when the request still reached the server.

### P3: Notes

- [x] AC-008: WHEN a topic is shown THEN system SHALL show a short intro, at most about six key points and one or two Do / Avoid pairs with reference links (MDN, web.dev).

## Edge Cases

- WHEN the URL has no scheme ("example.com") THEN the dissector SHALL explain that it isn't an absolute URL.
- WHEN DNS lookups fail on the server (offline) THEN the demo SHALL show the error and stay usable.
- WHEN the browser blocks a CORS request THEN the page SHALL not crash; the console error is expected and the demo says so.
- WHEN the screen is 360 px wide THEN the page SHALL not scroll sideways.

## Success Criteria

- [x] Demos react: `http://a.example:8080/p?q=1#f` is split correctly with origin `http://a.example:8080`; a lookup of a real name returns A records with TTLs and an unknown name says "doesn't exist"; `https://app.example.com` vs `https://api.example.com` is same-site but not same-origin; a simple POST with no CORS headers is blocked yet logged by the server; a JSON POST stops at the preflight until the server allows the origin and the header, then goes through (preflight and POST in the log); `*` with credentials is blocked.
- [x] Under ~1,300 words of prose outside the demos.
- [x] 0 serious/critical axe issues in both themes; no sideways scroll at 360 px.

## Open Questions

- None. Defaults are in decisions.md.

## Baseline

### Current Behavior

- Browser & Web Platform has one page (Networking); DNS appears only as one step of a request.

### Gaps / Limitations

- Nothing explains origins, sites or CORS errors.
