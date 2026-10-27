---
id: 003
feature: learner-name
type: brownfield
scope: medium
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Feature: Learner name

## Overview

The app has no idea who it is talking to: every screen says "bạn". The owner wants each learner to give a name on their first visit, so the app can greet them by name and, later, print it on a certificate. There are still no accounts, so the name lives with the rest of the learner's data in the browser and travels with backups and sync.

## Goals

- [x] Every learner has a name stored before they use the app, with no way past the prompt without one
- [x] The name is used to greet the learner, can be changed later, and is kept by backup and sync so a future certificate can use it

## Out of Scope

| Feature | Reason |
|---------|--------|
| Certificates | Planned later; this feature only stores the name they will use |
| Accounts, email or any server-side copy of the name | The app stays account-free; the name only leaves the browser inside the learner's own backup or sync blob |
| Using the name in more places (lesson end, score screen) | Start with the greeting and welcome dialog; add more once the name exists |

## User Stories

### P1: Give my name on the first visit

- As a new learner, I want to be asked my name before I start so that the app talks to me personally
- **Why P1:** The owner's request; the certificate later depends on every learner having a name
- **Independent Test:** Open the app in a fresh browser: a name dialog appears before the placement test, can't be closed without a valid name, and the name is saved

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens any page and no name is stored THEN system SHALL show a Vietnamese dialog asking for their name, before the placement test and before the welcome dialog
- [x] AC-002: WHEN the name dialog is open THEN system SHALL not close it with Escape, an outside click or a close button; the only way on is saving a valid name
- [x] AC-003: WHEN the learner submits a name THEN system SHALL trim it, collapse repeated spaces, and accept it only if it has 1 to 40 characters and at least one letter; otherwise SHALL show a Vietnamese error next to the field and keep the dialog open
- [x] AC-004: WHEN a valid name is saved THEN system SHALL store it with the learner's progress (included in backup files and sync, never in anonymous stats) and close the dialog
- [x] AC-005: WHEN a learner who already used the app before this feature opens it THEN system SHALL ask for their name once in the same way, without losing any progress

### P2: See and change my name

- As a learner, I want the app to greet me by name and let me fix it so that it is right on a future certificate
- **Why P2:** Makes the name visible and correctable, but the stored name is what matters first

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner with a name opens the home screen THEN system SHALL greet them by name ("Chào {tên}!"), and the first-visit welcome dialog SHALL address them by name
- [x] AC-007: WHEN the learner opens Settings THEN system SHALL show their name in an editable field and save a change with the same rules as AC-003, confirming with a Vietnamese message

## Edge Cases

- WHEN the name is only spaces, punctuation or digits THEN system SHALL reject it with "Bạn nhập tên của mình nhé (tối đa 40 ký tự)."
- WHEN the name has Vietnamese diacritics or more than one word ("Lê Trần Gia Huy") THEN system SHALL accept and show it unchanged apart from spacing
- WHEN two devices have different names and sync THEN system SHALL keep the most recently changed name on both (last change wins)
- WHEN saving the name fails (blocked browser storage) THEN system SHALL keep the dialog open and show a Vietnamese error toast

## Success Criteria

- [x] A fresh browser cannot reach the placement test, a lesson or any page's content without saving a name
- [x] Importing a backup that has a name puts that name in place of the one typed in the new browser; sync keeps the most recently changed name

## Evidence

- AC-001, AC-002, AC-003: `src/components/name/name-prompt.test.tsx`; e2e `first-visit.spec.ts` "the name prompt can't be dismissed…" (shown on /placement before the test, Escape keeps it, "123" rejected)
- AC-004: `name-prompt.test.tsx` (stored with a timestamp), `src/learning/snapshot.test.ts` (in backups), `settings.test.tsx` (import replaces it); stats send counts only
- AC-005: `name-prompt.test.tsx` "asks a learner from before names existed"
- AC-006: e2e `first-visit.spec.ts` ("Chào mừng Minh Anh", "Chào Minh Anh!")
- AC-007: `name-prompt.test.tsx` NameSetting
- Gates 2026-10-27: lint, typecheck, 518 unit tests, build, 10/10 e2e

## Open Questions

- None

## Notes

Requested 2026-10-27 by the owner: "require user enter the name, we will use this name for communicate and create the certificate (in the future)". Changes the first-visit flow of feature 001 (AC-038: the welcome dialog now comes after the name).

## Baseline

### Current Behavior

- A new learner goes straight to the placement test, then sees the welcome dialog on the home screen. Nothing asks who they are.

### Gaps / Limitations

- The app can't greet the learner or put their name on anything.
