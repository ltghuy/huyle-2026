---
id: "021"
feature: jwt-handbook
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-11
---

# Feature: Security section, JSON Web Tokens

## Overview

Learners use JWTs every day ("put the token in the Authorization header")
without a model of what the token actually proves, who can read it, what a
verifier must check, or why "log out" and "revoke" are hard. Senior
interviews probe exactly those gaps: `alg: none`, key confusion, refresh
rotation, where to keep tokens in the browser, and when a server session is
simply the better choice.

The Origins and CORS page (feature 019) left security topics for a later
page. This feature opens a new **Security** section in the handbook and
writes its first page, **JSON Web Tokens**: five short topics, each with a
live demo. Tokens are really signed and verified by this site's server, the
attacks are run against a real (deliberately naive) verifier, and storage
attacks run real scripts against real browser storage and cookies.
Simplifications are labelled.

## Goals

- [x] The Security section and the JWT page can each be reached in one click from the sidebar and the home page, and the section page lists the JWT page.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.
- [x] Every signature, verification, attack, refresh and cookie result shown comes from a real run (the server's real signing and checks, the browser's real storage and cookie rules), never a scripted answer.

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth 2.0 / OpenID Connect flows (authorization code, PKCE, ID tokens) | Their own page later; this page explains the token those flows hand out |
| Encrypted tokens (JWE) and nested tokens | Mentioned in a note only; signed tokens (JWS) are what learners meet |
| XSS, CSP and CSRF in depth | Later Security pages; this page shows only what each does to a stored token |
| Real user accounts, passwords or login | The demo "user" is a fixed sample; nothing personal is stored |
| Calling third-party identity providers or fetching remote key sets | All keys and tokens come from this site's server |
| Every registered claim and algorithm (PS256, EdDSA, x5c, jku…) | Main ones only; links cover the rest |

## User Stories

### P1: Reach the section and the page

- As a learner, I want a Security section with the JWT page in it so that I can find security topics in one place.
- **Why P1:** Without a route and navigation nothing else can be seen.
- **Independent Test:** From the home page, open Security, then JSON Web Tokens; breadcrumbs lead back.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page is shown THEN the Security section SHALL appear as a card with a summary and its progress (1 of 1 page written), linking to the section page.
- [x] AC-002: WHEN the sidebar is shown THEN it SHALL have a Security folder listing the JSON Web Tokens page; the section page SHALL list the page with its summary.
- [x] AC-003: WHEN the JWT page opens THEN it SHALL show breadcrumbs (Home, Security, page), title, intro and a topic list linking to its five topics.

### P1: Anatomy and signing

- As a learner, I want to get a real token, see its three parts decoded, and watch verification fail when I change one character, so that I understand a JWT is signed, not encrypted.
- **Why P1:** Every later topic assumes this model.
- **Independent Test:** Issue an RS256 token, change one letter of the payload, verify, and see it rejected with the reason.

**Acceptance Criteria:**

- [x] AC-004: WHEN the learner asks for a token with a chosen algorithm (HS256, RS256 or ES256) and edits its claims (subject, role, lifetime) THEN the server SHALL sign it and the page SHALL show the compact token with its three parts coloured, and the decoded header and payload with each registered claim explained in words (times also shown as readable dates).
- [x] AC-005: WHEN the learner pastes or edits any token THEN the page SHALL decode it as they type, without asking the server, and say clearly that anyone can read the payload; WHEN the text is not a well-formed token THEN it SHALL say which part is wrong (number of parts, not base64url, not JSON).
- [x] AC-006: WHEN the learner sends the (possibly edited) token to be verified THEN the server SHALL check it and the page SHALL show each check it ran (signature, algorithm, expiry, not-before, issuer, audience) with pass/fail, and the overall result; a one-character change to header or payload SHALL fail the signature check.
- [x] AC-007: WHEN a token is shown THEN the page SHALL explain, labelled simplified, what is signed (header and payload text, joined by a dot) and how HMAC (one shared secret) differs from RSA/ECDSA (private key signs, public key verifies), including token size per algorithm.

### P1: Verification attacks

- As a learner, I want to run known attacks against a naive verifier and a strict one, so that I know which checks are not optional.
- **Why P1:** This is the senior-level core: most real JWT incidents are verifier bugs.
- **Independent Test:** Run the "alg: none" attack; the naive verifier accepts it, the strict one rejects it and names the check.

**Acceptance Criteria:**

- [x] AC-008: WHEN the learner runs an attack (alg none, RS256 to HS256 key confusion using the public key as the secret, the attacker's own public key embedded in the token header, an expired token, a token issued for another audience, a token from another issuer) THEN the server SHALL build the forged or broken token for real and run it through both verifiers, and the page SHALL show the token, each verifier's result, and for the strict verifier the check that stopped it.
- [x] AC-009: WHEN an attack succeeds against the naive verifier THEN the page SHALL say in words what the mistake was (trusting the token's own algorithm, not pinning allowed algorithms per key, trusting a key the token brings, skipping a claim check) and what the correct rule is.
- [x] AC-010: WHEN the learner switches individual strict checks off THEN the strict verifier SHALL run with only the remaining checks, so the learner can see which single check blocks each attack.

### P1: Lifecycle, refresh and revocation

- As a learner, I want to watch a short-lived access token expire, refresh it, and see what happens when a stolen refresh token is replayed, so that rotation and revocation stop being abstract.
- **Why P1:** Expiry and refresh are where stateless tokens meet real requirements.
- **Independent Test:** Log in, wait for expiry, call the API (rejected), refresh (new pair), replay the old refresh token (reuse detected, whole session revoked).

**Acceptance Criteria:**

- [x] AC-011: WHEN the learner signs in to the demo THEN the server SHALL issue a short-lived access token and a refresh token, and the page SHALL show both with a live countdown to the access token's expiry and the server's own log of each request it handled.
- [x] AC-012: WHEN the learner calls the protected demo API THEN the server SHALL accept a valid access token and reject an expired or revoked one with a reason; a clock-skew allowance chosen by the learner SHALL change when an expired token stops being accepted.
- [x] AC-013: WHEN the learner refreshes THEN the server SHALL issue a new pair and retire the used refresh token; WHEN an already-used refresh token is presented again THEN the server SHALL treat it as theft, revoke every token in that session, and the page SHALL show both the "attacker" and the "user" being signed out.
- [x] AC-014: WHEN the learner signs out or revokes THEN the page SHALL let them compare revocation by a deny-list of token ids and by bumping the user's token version, show that an access token keeps working until expiry when neither is used, and show the server state each approach needs.

### P1: Tokens in the browser

- As a learner, I want to store a token in different places and run an injected script and a cross-site request against each, so that I can choose where a token belongs.
- **Why P1:** "localStorage or cookie?" is the most common interview question about JWTs.
- **Independent Test:** Store the token in localStorage, run the injected script, see it read the token; switch to an HttpOnly cookie, run it again, see it fail to read it but still able to make requests.

**Acceptance Criteria:**

- [x] AC-015: WHEN the learner chooses where the token lives (localStorage, sessionStorage, a page variable, an HttpOnly cookie with a chosen SameSite) THEN the page SHALL really store it there (the cookie set by the server) and show where it is.
- [x] AC-016: WHEN the learner runs the "injected script" THEN it SHALL really run in this page and the page SHALL show what it could read and whether it could still send an authenticated request; WHEN the token is in an HttpOnly cookie THEN reading SHALL fail and the page SHALL point out that requests still succeed (XSS is still game over, just not exfiltration).
- [x] AC-017: WHEN the learner sends a request from another site (a page with a different origin) THEN the page SHALL show whether the cookie went with it under the chosen SameSite value, from the server's log, and whether a token kept in storage could be sent at all.
- [x] AC-018: WHEN the topic is shown THEN it SHALL compare a plain server session, a token held by the page, and a backend-for-frontend that keeps tokens on the server, and say when each is the better choice.

### P2: Keys and rotation

- As a learner, I want to rotate the signing key and see old and new tokens verified by key id, so that I understand published key sets and rotation without downtime.
- **Why P2:** Matters in production and senior interviews, but the page works without it.

**Acceptance Criteria:**

- [x] AC-019: WHEN the learner looks at the key set THEN the page SHALL show the server's published public keys (each with its key id and algorithm) and never any private or shared secret.
- [x] AC-020: WHEN the learner adds a new key, makes it the signing key and retires the old one THEN tokens signed with the old key SHALL keep verifying until it is retired and fail afterwards with "unknown key id"; tokens SHALL be verified with the key their id names, limited to that key's algorithm.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-021: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (claim checks to always do, size and header limits, what never to put in a payload) and links to the RFCs and OWASP guidance.

## Edge Cases

- WHEN a pasted token is very long or not a token at all THEN decoding SHALL stay responsive and show an error instead of breaking the page; the server SHALL reject oversized input.
- WHEN the learner edits the payload to invalid JSON THEN the page SHALL say so and still allow verification (which fails).
- WHEN two browser tabs use the lifecycle demo THEN each SHALL have its own demo session and log.
- WHEN the server restarts THEN demo keys and sessions SHALL be recreated, and old tokens SHALL fail verification with a reason rather than an error.
- WHEN cookies are blocked or storage throws (private mode) THEN the storage demo SHALL say so instead of showing a wrong result.
- WHEN the access-token countdown reaches zero while the tab is hidden THEN the countdown SHALL be correct when the tab is shown again.

## Success Criteria

- [x] Every attack in the list is accepted by the naive verifier and rejected by the strict one, each for the stated reason.
- [x] The refresh-reuse scenario revokes the whole session in one step and both parties see it.
- [x] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- Requested as a "senior level" explanation: depth over breadth. Notes are short; the detail lives in the demos and the read-more.
- Placement chosen by the user: a new top-level Security section rather than a fourth Browser & Web Platform page, leaving room for XSS, CSP and CSRF pages.
- Topics chosen by the user: anatomy and signing, verification attacks, lifecycle and refresh, browser storage and sessions (including key rotation).

## Baseline

### Current Behavior

- The handbook has four sections: React Practices, Browser & Web Platform and Performance & Accessibility have content; Frontend System Design is shown as coming soon.
- Browser & Web Platform's summary mentions XSS, CSP and CORS; only CORS has a page.
- No page explains authentication or tokens.

### Gaps / Limitations

- No home for security topics; learners can't find token or session guidance.
