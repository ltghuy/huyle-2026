---
id: 029
feature: legal-pages
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-08
---

# Feature: Terms of use and a privacy policy in the usual Vietnamese form

## Overview

Quick 055 put a footer on the home page with a link to `/privacy` and a note naming Nghị định 13/2023/NĐ-CP (personal data) and 147/2024/NĐ-CP (network services). The privacy page is accurate, but it is written as plain notes and does not cite the decree, list the learner's rights, or say what the data is used for. There is no terms page. The owner asked to follow engdailystreak.com/terms and /privacy and fit them to what Streak Daily actually does.

The reference structure is borrowed, not its claims. Streak Daily has no passwords, no AI key, no chat, no donations and no phone hotline, so those sections are left out. Every statement on both pages must match the code.

## Goals

- [x] A learner can read, from the footer of every page with navigation, what data the app keeps, why, their rights under Nghị định 13/2023/NĐ-CP and how to use them
- [x] A learner can read the terms of use, including the conduct rules under Nghị định 147/2024/NĐ-CP

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sections about passwords, AI keys (BYOK), chat, donations or a hotline | The app has none of these |
| A consent checkbox at sign-in | Not asked for; the pages say that signing in means agreeing |
| An age limit | The reference has none, and the owner has not asked for one |
| Moderation tools in the app | The terms reserve the right; the tools are a separate feature |

## User Stories

### P1: Read the privacy policy

- As a learner, I want the privacy page to say what is kept, why, who receives it, how long it stays and what my rights are, so that I can decide whether to sign in
- **Why P1:** Nghị định 13/2023/NĐ-CP asks for this notice, and the footer now cites it
- **Independent Test:** open `/privacy`: numbered sections cover scope, data, purposes, who sees it, third parties, retention, rights, withdrawal and deletion, security and contact

**Acceptance Criteria:**

- [x] AC-001: WHEN a visitor opens `/privacy` THEN system SHALL show a last-updated date and these numbered sections in order: scope (citing Nghị định 13/2023/NĐ-CP), data collected, purposes, what others see, third parties, retention, the learner's rights, how to withdraw consent and delete data, security, contact
- [x] AC-002: WHEN the privacy page describes data THEN every statement SHALL match what the app stores today; the facts already on the page (022 AC-025) are kept, and it adds that the IP address is used only to limit repeated requests and is not stored, and that Google and Cloudflare servers may be outside Vietnam
- [x] AC-003: WHEN the privacy page lists rights THEN each right SHALL say where in the app to use it (Cài đặt for the display name, statistics, leaving the board, exporting progress and deleting the account) or to contact the owner

### P1: Read the terms of use

- As a learner, I want terms that say what the service is, what I may not do and what the owner is not responsible for, so that I know the rules
- **Why P1:** the footer has no terms link yet, and the reference has one
- **Independent Test:** open `/terms` from the home footer

**Acceptance Criteria:**

- [x] AC-004: WHEN a visitor opens `/terms` THEN system SHALL show a last-updated date and numbered sections: acceptance, the service, accounts, conduct rules (citing Nghị định 147/2024/NĐ-CP), handling violations, learning content, intellectual property (linking Nguồn dữ liệu), disclaimer, changes to the terms, governing law and complaints, contact
- [x] AC-005: WHEN the conduct section lists what learners can publish THEN it SHALL name what the app actually shows to others: the display name on the leaderboard and in Arena, and answers reported for review
- [x] AC-006: WHEN a visitor reaches the end of any page with navigation THEN system SHALL show the footer from quick 055 (copyright, the note naming both decrees, "Quyền riêng tư" and "Điều khoản" linking to `/privacy` and `/terms`); focus-mode screens (lessons, review sessions, the placement test, the Arena room) have no footer, as they have no navigation
- [x] AC-007: WHEN search engines read the sitemap THEN it SHALL list `/terms`

## Edge Cases

- WHEN a learner cannot sign in to delete their account THEN the privacy page SHALL tell them to contact the owner
- WHEN either page changes THEN its last-updated date SHALL change with it

## Success Criteria

- [x] Both pages are reachable in one tap from the footer of every page with navigation, and both are static
- [x] No statement on either page describes something the app does not do

## Open Questions

- The owner may want a contact email. Until one is given, both pages point to huyle.work, as the privacy page did before.
- Vietnam's Personal Data Protection Law (Law 91/2025/QH15) may supersede Nghị định 13/2023/NĐ-CP. The owner chose to cite the decree, like the reference.

## Notes

- Reference pages read on 2026-11-08: engdailystreak.com/terms and engdailystreak.com/privacy.
- Both pages keep the existing layout of `/privacy` (page header, one card per section), so no new page design is needed.

## Baseline

### Current Behavior

- `/privacy` has seven unnumbered sections in plain language about what is stored and how to delete it, with a contact line at the end.
- There is no terms page.

### Gaps / Limitations

- The privacy page cites no law, does not list the learner's rights and does not say why each piece of data is kept.

## Verification

- 2026-11-08: `pnpm lint`, `pnpm typecheck`, `pnpm test` (1271 passed) and `pnpm build` pass; `/`, `/privacy` and `/terms` are static. `privacy/page.test.tsx` covers AC-001 and AC-003, `terms/page.test.tsx` AC-004 and AC-005, `shell/site-footer.test.tsx` AC-006. AC-007: `/terms` is in the sitemap paths.
- AC-002 checked against the code: the IP is only the limiter key (`src/server/auth/throttle.ts`, `leaderboard/secret.ts`, `arena/request.ts`), account deletion is immediate (`account.service.ts`), "Xuất tiến độ" and "Xóa tài khoản" are in Cài đặt, progress is read by the session's user id (`api/progress/route.ts`).
- 2026-11-08: checked in the browser on `/credits` and `/terms` at 1280 px and 390 px; the footer ends the page, clears the mobile bar, the raised Arena button and the back-to-top button, with no horizontal scroll (`scrollWidth` 375).

- 2026-11-08: at 800 px (sidebar open) "Quyền riêng tư" wrapped onto three lines; the footer links no longer wrap and the link column doesn't shrink.

## Audit

2026-11-08. Goal 1 said "every page" while AC-006 says "every page with navigation"; the goal now matches AC-006 (focus-mode screens have no navigation and no footer).

| Target | Result | Evidence |
|--------|--------|----------|
| G1: privacy policy, rights and how to use them, from the footer | Met | `SiteFooter` in the `(app)` layout, `site-footer.test.tsx`, `privacy/page.test.tsx` (ten sections, decree cited, Cài đặt link) |
| G2: terms of use with the conduct rules | Met | `terms/page.test.tsx` (eleven sections, Nghị định 147/2024/NĐ-CP heading, conduct scope) |
| SC1: one tap from every footer, both static | Met | footer links tested; build shows `○ /privacy` and `○ /terms`; browser check at 1280 px and 390 px |
| SC2: no statement the app does not back | Met after a fix | Each fact checked against the code: session 30 days (`auth.ts`), reports and board 90 days (`claims.service.ts`, `leaderboard.service.ts`), 50 matches (`learning/arena/history.ts`), daily device hash (`stats.service.ts`), IP only as limiter key, immediate deletion. One claim was wrong: the page said a changed Google name or picture follows into the app, but better-auth keeps the first sign-in's name and picture because `overrideUserInfoOnSignIn` is not set. The rights list now says to contact the owner to change them. |
