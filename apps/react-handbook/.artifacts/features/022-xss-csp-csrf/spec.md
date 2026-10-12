---
id: "022"
feature: xss-csp-csrf
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-12
---

# Feature: Security page, XSS, CSP and CSRF

## Overview

The Security section opened with JSON Web Tokens (feature 021), which kept
reaching one conclusion the learner couldn't yet act on: "stop XSS first".
This feature adds the section's second page, **XSS, CSP and CSRF** — the core
triad of web attacks a frontend engineer is responsible for. Three topics,
each a short senior-level note with a live demo: how untrusted content becomes
running script and how output encoding stops it; how a Content-Security-Policy
is a second wall when encoding slips; and how another site makes a request as
the logged-in user, and what actually blocks it.

Attacks run for real inside a sandboxed, opaque-origin iframe (the pattern
from features 019–021): payloads really execute, a real CSP really blocks
them, and cross-site requests really reach (or don't reach) a server lab that
logs what it saw. Nothing escapes the demo's own frame.

## Goals

- [x] The page is reachable in one click from the sidebar, the Security section page and the home card (Security shows 2 of 2 pages written), and the JWT page links to it where it says "stop XSS first".
- [x] Each of the three topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.
- [x] Every attack result shown comes from a real run: a payload that really executed in the sandbox, a CSP the browser really enforced (reported from its own violation events), and a cross-site request the server lab really received (or was really blocked before it arrived). Simplifications are labelled.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A full XSS filter or sanitizer library | The lesson is encoding per context and framework defaults, not building DOMPurify |
| Clickjacking, SRI, supply-chain, secrets in the bundle | Their own later Security pages |
| Server-side template-injection and SQL injection | This is the frontend handbook; XSS is the client-side injection |
| Trusted Types in depth | One note and a link; browser support is uneven |
| Real auth, accounts or money | The CSRF "bank" is a sample endpoint with a demo session; nothing real moves |

## User Stories

### P1: Reach the page

- As a learner, I want the new page listed and linked so that I can find it from the section and from the JWT page's XSS warning.
- **Why P1:** Nothing is usable without the route and navigation.
- **Independent Test:** From the home Security card, open the section, then the page; the JWT storage topic links to it.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home card, the sidebar or the Security section page is shown THEN the page SHALL be listed and counted (Security: 2 of 2 written), and the JWT page SHALL link to it.
- [x] AC-002: WHEN the page opens THEN it SHALL show breadcrumbs (Home, Security, page), title, intro and a topic list linking to its three topics.

### P1: XSS, how content becomes script

- As a learner, I want to inject into a small app through different sinks and see which ones run my payload, so that I understand XSS is an output-encoding bug, not an input problem.
- **Why P1:** XSS is the attack the rest of the page defends against.
- **Independent Test:** Put a script-bearing payload into the unsafe HTML sink and see it execute (reported from inside the sandbox); switch the same app to the text sink and see the same payload rendered as harmless text.

**Acceptance Criteria:**

- [x] AC-003: WHEN the learner enters a payload and picks a sink (HTML body via innerHTML, a text node, an element attribute, a link's href) THEN the sandboxed app SHALL render it that way and the page SHALL report whether the payload executed, where, and why that sink did or didn't run it.
- [x] AC-004: WHEN the same payload is shown through a context-correct encoding (HTML-escaped text, attribute-encoded value, a scheme-checked URL) THEN the page SHALL show it rendered inert, and name the encoding that made it safe.
- [x] AC-005: WHEN the topic is shown THEN it SHALL distinguish stored, reflected and DOM-based XSS, and show where a framework escapes by default and the specific openings that bypass it (an HTML-injection sink, an unchecked URL, injecting into markup the framework doesn't control).
- [x] AC-006: WHEN a payload executes THEN it SHALL run only inside the opaque-origin sandbox and SHALL NOT read anything of the handbook page; the demo SHALL say so.

### P1: CSP, a second wall

- As a learner, I want to edit a Content-Security-Policy on a page and watch it block things, so that I know what a policy does and doesn't buy me.
- **Why P1:** CSP is the standard defence-in-depth for XSS; it's the natural pair to topic 1.
- **Independent Test:** Load the sample page with no CSP and an inline script runs; add a policy without `unsafe-inline` and the same inline script is blocked, reported from the browser's own violation event.

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner builds a policy (default-src, script-src with none / self / nonce / `unsafe-inline` / `strict-dynamic`, img-src) THEN a sample page SHALL be served with exactly that policy as a real response header, and SHALL attempt an inline script, a nonced inline script, an external script and an image.
- [x] AC-008: WHEN the policy blocks something THEN the page SHALL show it, drawn from the browser's own enforcement of the sample page (which of the attempted scripts and the image actually ran versus were blocked, and the directive responsible), and say in words why.
- [x] AC-009: WHEN the topic is shown THEN it SHALL explain nonces vs hashes vs `unsafe-inline`, why `strict-dynamic` exists, report-only mode, and that CSP is a second wall, not a replacement for encoding.

### P1: CSRF, a request as you

- As a learner, I want another site to make a state-changing request using my session, and then turn on the defences, so that I understand what CSRF is and what stops it.
- **Why P1:** CSRF is the cookie-session counterpart to the JWT storage topic and completes the triad.
- **Independent Test:** With an undefended cookie session, trigger a cross-site POST from another site and see the server perform the action; switch the cookie to SameSite=Lax or add a token and see the same attempt rejected.

**Acceptance Criteria:**

- [x] AC-010: WHEN the learner signs in to the sample app THEN the server SHALL set a session cookie with a chosen SameSite (None / Lax / Strict) and show the current state the app protects (e.g. an account balance), per browser session.
- [x] AC-011: WHEN the learner triggers a cross-site request from another site (a form POST and a `fetch`), under the chosen cookie policy and CSRF defence (none, a synchronizer token, a custom header the server requires) THEN the page SHALL show whether the cookie rode along and whether the server performed the action, from the server's own log.
- [x] AC-012: WHEN an attempt is blocked THEN the page SHALL say why (the browser withheld the cookie from an unrelated cross-site request; the token was missing; the required header was absent) and note when the request still reached the server but was refused.
- [x] AC-013: WHEN the topic is shown THEN it SHALL relate this back to tokens (a token in a header isn't sent automatically, so it isn't open to classic CSRF) and name SameSite's limits (it is not a complete defence on its own).

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-014: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points and links to the relevant OWASP cheat sheets and MDN / spec pages.

## Edge Cases

- WHEN a payload or policy is empty or malformed THEN the demo SHALL render safely and say what's missing rather than break.
- WHEN the browser delivers no violation event (nothing was blocked) THEN the CSP demo SHALL say the policy allowed everything attempted.
- WHEN two browser tabs use the CSRF demo THEN each SHALL have its own session and state.
- WHEN the sandbox can't run scripts (scripting disabled) THEN the XSS demo SHALL say so instead of reporting a false "safe".
- WHEN the server restarts THEN demo sessions SHALL be recreated and prior state SHALL reset without error.

## Success Criteria

- [x] In the XSS demo, the unsafe HTML sink runs a payload and the text sink renders the identical payload inert, each reported from inside the sandbox.
- [x] In the CSP demo, removing `unsafe-inline` turns an inline script from "ran" to "blocked", reported from a real violation event.
- [x] In the CSRF demo, a forged request that carries the cookie is applied with no defence and refused once a token (or required header) is on, from the server log; an unrelated cross-site request has its cookie withheld by the browser.
- [x] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo is usable with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- Resolved: in current Chrome the cookie is withheld from the opaque-origin frame's cross-site request (SameSite + third-party-cookie blocking) even with SameSite=None, so the demo shows that as the modern first line and demonstrates token/header defences against a forged request whose cookie still rides (a same-site/subdomain attacker or a pre-SameSite browser).

## Notes

- Requested as the three "Priority 1 — the core triad" topics on one page, after the JWT page.
- The demos deliberately reuse the sandboxed opaque-origin iframe and server-log patterns already established (features 019–021) so the attacks are real without a second domain.
- No browser alert/confirm/prompt dialogs in any demo (they freeze the automation harness and are poor UX); a payload that "runs" reports itself through a visible marker and a postMessage, not a dialog.

## Baseline

### Current Behavior

- The Security section (feature 021) has one page, JSON Web Tokens, which defers XSS, CSP and CSRF to later Security pages and repeatedly tells the reader to "stop XSS first".

### Gaps / Limitations

- No page explains how XSS actually happens, what CSP does, or how CSRF works and is stopped — the defences the JWT page assumes.
