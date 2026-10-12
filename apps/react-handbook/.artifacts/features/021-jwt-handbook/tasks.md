---
id: "021"
feature: jwt-handbook
created: 2026-10-11
---

# Tasks: Security section, JSON Web Tokens

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┬--> T003 (anatomy) --> T004 (attacks) --┐
                ├--> T005 (lifecycle) -------------------┤
                ├--> T006 (storage) ---------------------┼--> T008 --> T009
                └--> T007 (keys) ------------------------┘
```

T001 adds the section and page shell; T002 the JWS core every lab uses.
T003–T007 touch separate files. T008 writes the topic notes around the
finished demos; T009 verifies and audits.

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after each commit group and at the end)

## Tasks

### Section and shell

- [x] T001 Add the `security` section (catalog, `SECURITY_PATH`, icon, sidebar folder, home copy, `/security` route) and the `jwt` topic page (catalog entry, route, content skeleton with intro, TOC and five `Topic` placeholders)
  - **Done when:** `/security` lists the page (1 of 1 written); `/security/jwt` shows breadcrumbs Handbook › Security › page, title and TOC; the sidebar has a Security folder; the home page has a Security card.

### Core

- [x] T002 [B:T001] Add `jwt-format.ts` (base64url, decode with per-part errors, claim descriptions), `jwt.schema.ts` (Zod bodies, checks, results), `jws.ts` (lazy demo keys, sign HS256/RS256/ES256, `verifyJwt` with `VerifyChecks`, leeway, expected iss/aud)
  - **Done when:** a scratch script signs and verifies with each alg; a one-character payload change fails `signature`; `none` passes only with `pinAlg` off; ES256 signature is 64 bytes.

### Demos

- [x] T003 [B:T002] Token and verify routes + AnatomyDemo: alg and claim controls, coloured token with legend, live client decode with errors, editable token, verify with checks list, signing explanation with size per alg
  - **Done when:** issue → edit one char → verify shows signature fail; malformed text shows which part is wrong; works at 360 px.

- [x] T004 [B:T003] Attack builder + route + AttacksDemo: six attacks, naive vs strict side by side, check switches, explanations in words
  - **Done when:** each attack is accepted by naive and rejected by strict at the stated check; turning off exactly that check lets it through.

- [x] T005 [P] [B:T002] Session lab + routes + LifecycleDemo: login (ttl, revocation mode), countdown, call API with leeway, refresh rotation, steal + replay → session revoked, logout by mode, server log and state
  - **Done when:** the scratch scenario passes; in the browser the countdown is right after the tab was hidden; reuse signs out both parties.

- [x] T006 [P] [B:T002] Cookie lab + routes + StorageDemo: storage choice, real HttpOnly cookie with SameSite, injected script (read + capture via fetch wrap), cross-site request from a sandboxed frame with the server log, sessions vs token vs BFF comparison
  - **Done when:** HttpOnly unreadable but requests succeed; memory mode is captured on the next call; SameSite results recorded from the real browser and the note matches them.

- [x] T007 [P] [B:T002] Key ring + route + KeysDemo: JWKS view, add / promote / retire, sign and verify with the ring
  - **Done when:** an old-kid token verifies until retired, then fails with "unknown key id"; no private members in the JWKS response.

### Content and close

- [x] T008 [B:T003,T004,T005,T006,T007] Write the five topics (intro, points, advice, read-more, RFC/OWASP links) and the section intro
  - **Done when:** each topic reads in about one screen; links open in a new tab.

- [x] T009 [B:T008] Verify (gates, axe light/dark, 360 px, keyboard), update knowledge.md, audit
  - **Done when:** typecheck, lint, build pass; ACs marked with evidence; audit written.
