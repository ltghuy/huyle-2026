---
id: "022"
feature: xss-csp-csrf
created: 2026-10-12
---

# Audit: Security page, XSS, CSP and CSRF

## Goals

- [x] Page reachable from sidebar, section page and home (Security 2 of 2), and linked from the JWT page — catalog row + `/security/xss-csp-csrf` route + existing `topicFolder("security")`; JWT storage topic links to it; build shows the route prerendered; page renders h1 + 3 topics + 3 demos.
- [x] Three one-screen topics each with an input-driven live demo — verified in the browser.
- [x] Every result from a real run — XSS payload really executed in the sandbox (and inert via text sink); CSP policy served as a real header, enforcement read from what actually ran; CSRF cookie decision and transfer come from the server log. Confirmed by scratch scripts and Puppeteer.

## Success Criteria

- [x] XSS: HTML sink ran the payload (`img onerror`), text sink rendered it inert — browser-verified.
- [x] CSP: dropping `unsafe-inline` flips the inline script from "ran" to "blocked" — browser-verified; report-only noted.
- [x] CSRF: a forged request carrying the cookie is applied with no defence and refused once a token is on; an unrelated cross-site request has its cookie withheld by the browser — browser-verified.
- [x] axe clean in light and dark; no horizontal scroll at 360 px; demos keyboard-operable (native inputs/buttons). One light-mode contrast issue (destructive badge, a known project gotcha) fixed with `DESTRUCTIVE_TEXT`.
- [x] typecheck, lint, build pass.

## Notes

- Open question resolved during verification: current Chrome withholds third-party cookies from the opaque-origin frame even at SameSite=None, so the demo presents that as the modern first line and demonstrates the token/header defences against a forged request whose cookie still rides (same-site/subdomain attacker, or a pre-SameSite browser). Spec success criterion and AC-012 were updated to match this reality before marking done.
