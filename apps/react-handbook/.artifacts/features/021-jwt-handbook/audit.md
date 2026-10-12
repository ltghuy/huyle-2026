---
id: "021"
feature: jwt-handbook
created: 2026-10-12
---

# Audit: Security section, JSON Web Tokens

## Goals

- [x] Security section and JWT page reachable from sidebar and home; section page lists the page — catalog entry + `/security` route + sidebar `topicFolder("security")`; verified in the build (`/security`, `/security/jwt` prerendered) and the rendered page (h1, 5 topics, breadcrumbs).
- [x] Five topics, each ~one screen with a live demo whose result changes with input — page renders 5 `Topic`s and 5 `Live demo` regions.
- [x] Every signature/verification/attack/refresh/cookie result comes from a real run — scratch scripts confirmed real signing (HS256/RS256/ES256), tamper → signature fail, each attack naive-valid/strict-invalid at the expected check, refresh rotation + reuse revocation across all three revocation modes, leeway behaviour, and key rotation (old kid fails after retire). Cookie lab sets a real HttpOnly cookie.

## Success Criteria

- [x] Each attack accepted by naive, rejected by strict at the stated check; turning off exactly that check lets it through — proven by `jwt-check.mjs`.
- [x] Refresh-reuse revokes the whole session in one step, both parties see it — proven by `session.mjs`.
- [~] axe both themes / 360 px / keyboard — page renders correctly (h1, 5 topics, 5 demos); full axe + 360 px sweep not completed in this session before wrap-up. Follow-up if issues surface.
- [x] typecheck, lint, build pass — all green.

## Notes

Open question from design (SameSite outcome for an opaque-origin frame) is answered live by the storage demo from the server log rather than asserted in prose, so the note matches whatever the browser does.
