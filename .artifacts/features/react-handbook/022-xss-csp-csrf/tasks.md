---
id: "022"
feature: xss-csp-csrf
created: 2026-10-12
---

# Tasks: Security page, XSS, CSP and CSRF

## Summary

Total: 7 | Completed: 7 | Remaining: 0

## Execution Plan

```
T001 --┬--> T002 (xss) -------┐
       ├--> T003 (csp) -------┼--> T006 --> T007
       └--> T004 --> T005 (csrf)
```

T001 adds the page shell + catalog + JWT link. T002 (XSS, client-only),
T003 (CSP lab + demo) and T004→T005 (CSRF lab + demo) are independent.
T006 writes the topic notes; T007 verifies and audits.

## Quality Gates

Run after each task or batch: pnpm lint · pnpm typecheck · pnpm build.

## Tasks

- [x] T001 Add the `xss-csp-csrf` catalog entry, the page route and a content skeleton (intro, TOC, three `Topic` placeholders); link to it from the JWT storage topic
  - **Done when:** `/security/xss-csp-csrf` shows breadcrumbs, title and TOC; Security shows 2 of 2 written in sidebar, section page and home card; the JWT page links to it.

- [x] T002 [B:T001] Encoding helpers + XSS demo: sink choice (html/text/attr/href), payload presets, sandboxed opaque-origin app that reports execution via postMessage + visible marker, encoded-safe comparison, stored/reflected/DOM note
  - **Done when:** the HTML sink runs a preset payload (reported from the sandbox); the text sink renders it inert; encoding toggle flips attr/href sinks to safe; no alert dialogs; payload can't read the parent.

- [x] T003 [P] [B:T001] CSP lab route (sample page served with the built policy header + an asset route) + CSP demo: policy controls, sample page in an iframe attempting inline/nonced/external script + image, violations from the page's own events
  - **Done when:** curl shows the exact CSP header per policy; in the browser an inline script runs with `unsafe-inline` and is blocked without it, reported from a real violation event; report-only mode allows but still reports.

- [x] T004 [P] [B:T001] CSRF lab: schema + service (login sets a SameSite cookie, `do` performs a transfer if cookie + defence allow, log) + routes
  - **Done when:** a scratch script shows the cookie attached and the transfer applied with SameSite=None/no defence, and refused with Lax, with a token missing, or without the required header.

- [x] T005 [B:T004] CSRF demo: sign in (SameSite + defence), show balance, trigger cross-site form POST and fetch from the opaque-origin frame, server log + state, token-isn't-cookie note
  - **Done when:** in the browser, a cross-site POST changes the balance with no defence and is refused after switching to Lax or adding a token; the log shows what arrived.

- [x] T006 [B:T002,T003,T005] Write the three topics (intro, points, advice, read-more, OWASP/MDN links) and the page intro
  - **Done when:** each topic reads in about one screen; links open in a new tab.

- [x] T007 [B:T006] Verify (gates, axe light/dark, 360 px, keyboard), update knowledge.md, audit
  - **Done when:** typecheck, lint, build pass; ACs marked with evidence; audit written.
