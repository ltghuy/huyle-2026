---
id: "018"
feature: networking-handbook
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-08
---

# Feature: Networking Handbook (HTTP, HTTPS and TCP)

## Overview

The handbook's "Browser & Web Platform" section is still marked coming soon,
so there is nowhere to learn how a page actually reaches the browser. This
feature opens the section as a folder and adds its first page,
**Networking: HTTP, HTTPS and TCP**: a short handbook on the path of a
request (DNS, TCP, TLS, HTTP), what TCP guarantees and costs, HTTP messages,
HTTP caching, the HTTP versions, and what HTTPS protects. Like the
Performance and Accessibility pages, it keeps to the main concepts and shows
each with a small live demo; some demos send real requests to this site.

## Goals

- [x] The Networking page can be opened in one click from the sidebar, the home page and the section page.
- [x] Each of the six topics fits on one screen of reading and has a demo whose result changes visibly when the learner changes the setting it teaches.
- [x] The HTTP message and caching demos send real requests and show what really came back (status, headers, whether the server was reached); anything modelled is labelled simulated.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Other Browser & Web Platform pages (rendering, storage, security) | Their own later features; not listed yet |
| CORS, cookies and web security in depth | Planned security page; mentioned in one line where relevant |
| Packet captures or real network throttling | The browser can't do this from a page; links point to DevTools |
| WebSockets, server-sent events | Practice 5 (real-time chat) covers them |

## User Stories

### P1: Reach the section and the page

- As a learner, I want Browser & Web Platform to be a folder with a Networking page so that I can study networking next to the other sections.
- **Independent Test:** Open the section and the page from the sidebar and the home page; refresh each address.

**Acceptance Criteria:**

- [x] AC-001: WHEN the sidebar is shown THEN Browser & Web Platform SHALL be a folder (not coming soon) listing the Networking page; the home card SHALL link to the section and count its written pages; the section page SHALL show a card per page.
- [x] AC-002: WHEN the Networking page is opened directly or refreshed THEN system SHALL show breadcrumbs (Handbook › Browser & Web Platform › Networking), title, a one-paragraph intro and a list of topics that jumps to each.

### P1: The journey of a request

- As a learner, I want to see how many round trips happen before the first byte arrives, and what changes that number.

**Acceptance Criteria:**

- [x] AC-003: WHEN the learner changes the round-trip time, HTTPS on or off, TLS 1.2 or 1.3, HTTP/3, or reusing an open connection THEN a simulated timeline SHALL show DNS, TCP, TLS and request steps, the number of round trips and the time to the first byte, labelled simulated.

### P1: TCP

- As a learner, I want to see how TCP slow start and packet loss affect how long a download takes.

**Acceptance Criteria:**

- [x] AC-004: WHEN the learner picks a file size, a round-trip time and a loss setting THEN system SHALL show, per round trip, how much data TCP may send (starting at 10 packets, doubling, halving after a loss), the total round trips and the time, labelled simulated.

### P1: HTTP messages

- As a learner, I want to send a real request with a chosen method and expected status and see the full request and response.

**Acceptance Criteria:**

- [x] AC-005: WHEN the learner sends a request with a method (GET, POST, PUT, DELETE), an optional JSON body and a status the server should answer with THEN system SHALL send it to this site and show the request line and headers the server received, and the real response status, status text, headers, body and time; each status class (2xx, 3xx, 4xx, 5xx) SHALL be explained in one line.

### P2: HTTP caching

- As a learner, I want to fetch the same resource twice with different caching rules and see whether the second one reached the server.

**Acceptance Criteria:**

- [x] AC-006: WHEN the learner fetches a resource with a chosen rule (no-store, max-age, or no-cache with an ETag) THEN each fetch SHALL show its real status, whether it came from the browser cache, and the server's own count of requests it received; with max-age the second fetch SHALL not reach the server, with no-cache + ETag it SHALL be revalidated (the server answers 304 Not Modified), and with no-store every fetch SHALL reach the server in full.

### P2: HTTP/1.1, HTTP/2 and HTTP/3

- As a learner, I want to compare how the three versions load the same files, with and without packet loss.

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner picks a version and a loss setting THEN a simulated waterfall SHALL show twelve files loading (HTTP/1.1: six connections, one file at a time each; HTTP/2: one connection, all at once, a loss stalls every file; HTTP/3: one connection, a loss stalls only its file) with the total time.
- [x] AC-008: WHEN the page is shown THEN system SHALL show the protocol this page and its files really arrived over, read from the browser.

### P2: HTTPS and TLS

- As a learner, I want to see what someone on the network can read with HTTP and with HTTPS.

**Acceptance Criteria:**

- [x] AC-009: WHEN the learner switches between HTTP and HTTPS THEN system SHALL show the parts of a sample login request (IP addresses, host name, path, headers, cookie, body, sizes and timing) and mark each as readable or encrypted for someone on the same network.
- [x] AC-010: WHEN the page is shown THEN system SHALL show this page's real protocol scheme and whether it runs in a secure context, and what that unlocks.

### P3: Short notes

- [x] AC-011: WHEN a topic is shown THEN system SHALL show a short intro, at most about six key points and one or two Do / Avoid pairs, with links to reference reading (MDN, web.dev).

## Edge Cases

- WHEN the learner sends invalid JSON as a body THEN system SHALL say so without sending.
- WHEN a real request fails (offline, server down) THEN the demo SHALL show the error and stay usable.
- WHEN the page is served over plain HTTP (local development) THEN the HTTPS facts SHALL say so honestly.
- WHEN the screen is 360 px wide THEN the page SHALL not scroll sideways.
- WHEN an unknown address under the section is opened THEN system SHALL show the not-found page.

## Success Criteria

- [x] Every demo reacts: TLS 1.3 and connection reuse cut round trips; loss makes the TCP download take more round trips; a chosen status comes back for real; max-age skips the server on the second fetch while ETag revalidates with a 304; HTTP/2 loss stalls every file while HTTP/3 stalls one; the HTTPS view hides path, headers and body.
- [x] The page reads in about ten minutes (under ~1,600 words of prose outside the demos).
- [x] 0 serious/critical axe issues in light and dark themes; no sideways scroll at 360 px.

## Open Questions

- None. Defaults are in decisions.md.

## Notes

Numbers used: TCP initial window 10 segments (about 14 KB); TCP handshake 1
round trip; TLS 1.3 1 round trip (TLS 1.2: 2); HTTP/3 (QUIC) combines
transport and TLS in 1 round trip; browsers open up to 6 HTTP/1.1
connections per host.

## Baseline

### Current Behavior

- The sidebar and home page list Browser & Web Platform as "coming soon"; it has no address.

### Gaps / Limitations

- No networking notes anywhere in the handbook.
