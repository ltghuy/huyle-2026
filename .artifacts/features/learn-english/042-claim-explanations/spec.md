---
id: 042
feature: claim-explanations
type: brownfield
scope: large
status: done
branch: main
created: 2026-11-12
---

# Feature: Explanations for approved wordings

## Overview

When AI grading (feature 033) accepts a learner's translation that differs from the course's English, the answer counts as correct and a claim goes to the owner's review in "Duyệt câu" (feature 038). The AI decides why it is right, but that reason is thrown away: the card shows only "AI chấm đúng", and once the owner approves, learners who later type the same wording just see "Chính xác!" with no idea why their phrasing works. This feature keeps the AI's reason, shows it on the claim card, lets the owner edit it (or write one for a claim the AI didn't grade) when approving, and shows it to every learner whose answer matches that wording from then on.

## Goals

- [x] The owner sees why the AI accepted a wording before deciding on it
- [x] A learner who writes an approved alternative wording learns why it is correct

## Out of Scope

| Feature | Reason |
|---------|--------|
| Explanations in the Arena's "Viết câu" questions | A reveal lasts a few seconds and shows the course's English; the race isn't the place to read |
| Explanations for the course's own English or accepted word orders | Those are the reference answers, not alternatives |
| AI explanations in `pnpm content:claims` (the CLI review sheet) | The admin tab replaced it for day-to-day review; the CLI keeps working without explanations |
| Explanations for claims already pending before this feature | Their AI reason was never kept; the owner can write one when approving |

## User Stories

### P1: See and edit the AI's reason when approving

- As the owner, I want each claim card to show why the AI accepted the wording, and to fix that text before approving, so that what learners read is right and clear
- **Why P1:** the request
- **Independent Test:** an AI-graded claim's card shows "AI giải thích: …"; "Duyệt" opens a dialog with that text editable; approving saves it with the wording

**Acceptance Criteria:**

- [x] AC-001: WHEN AI grading marks a translation correct THEN system SHALL ask the AI for one or two short Vietnamese sentences, addressing the learner as "bạn", saying why the wording is correct, and SHALL keep them with the claim it sends
- [x] AC-002: WHEN a claim group has an AI explanation THEN its card in "Duyệt câu" SHALL show it under the answer, labelled as the AI's; a group of several claims shows the first one that has an explanation
- [x] AC-003: WHEN the owner taps "Duyệt" THEN system SHALL open a dialog with the answer and an explanation box, prefilled with the AI's explanation (empty when there is none), at most 500 characters; "Duyệt" in the dialog approves, with the explanation if the box isn't empty
- [x] AC-004: WHEN a wording is approved with an explanation THEN system SHALL store the explanation with that wording in the content (kept by `pnpm content:pull` like any admin edit)
- [x] AC-005: WHEN the approved wording was already accepted (another claim approved it, or it matches the course's English) THEN system SHALL approve without changing the stored wordings, as today

### P1: Learners read the reason

- As a learner, I want to know why my different wording was marked correct so that I can use it with confidence
- **Why P1:** the explanation exists for them

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner's translation matches an approved wording that has an explanation, in any translate exercise (lesson, review, library, sets) THEN the result panel SHALL show "Chính xác!" with that explanation
- [x] AC-007: WHEN the AI has just accepted the learner's own answer THEN the result panel SHALL show the AI's explanation under "Một cách nói khác: …", before any approval
- [x] AC-008: WHEN the answer matches the course's English or an accepted word order THEN system SHALL show no explanation

## Edge Cases

- WHEN the AI returns an empty or missing explanation for a correct answer THEN system SHALL send the claim without one and the card SHALL show none
- WHEN the explanation is longer than 500 characters THEN system SHALL cut it to 500 before sending
- WHEN an older app sends a claim without an explanation THEN system SHALL store it as today
- WHEN a wording item has explanations for some accepted wordings and not others THEN system SHALL show only the ones it has
- WHEN the owner edits a wording item in "Nội dung" (feature 038) THEN system SHALL keep its explanations valid: each one belongs to an accepted wording

## Success Criteria

- [x] An AI-graded claim reaches the card with its reason, is approved with an edited reason, and a second learner typing that wording sees it
- [x] The tests and quality gates pass

## Open Questions

- None

## Notes

Requested by the owner on 2026-11-12. Answers the same day: the explanation is editable, prefilled, in an approve dialog; for claims with no AI text the owner may write one or leave it blank; the learner the AI just accepted sees the reason at once, others after approval.

## Baseline

### Current Behavior

- AI grading returns an explanation only for wrong answers; for right ones it is empty
- A claim card shows the Vietnamese sentence, accepted wordings, the answer and "AI chấm đúng"; "Duyệt" approves in one tap and adds the answer to the sentence's wording item
- A learner matching an approved wording sees "Chính xác!" only

### Gaps / Limitations

- The owner can't see the AI's reasoning, and learners never learn why their alternative is right

## Verification

- 2026-11-12: `pnpm --filter learn-english typecheck` and `lint` pass. `pnpm --filter learn-english test`: 1644 of 1645 pass; the one failure is `src/app/(app)/page.test.tsx` ("Miễn phí · Đăng nhập bằng Google"), caused by an unrelated working-tree edit of `home-hero.tsx` that removed that line, not by this feature. Tests added: `translate-ai.test.ts` (reason kept when correct, 500-character cap: AC-001), `exercise-runner.test.tsx` (reason shown at once and sent with the claim: AC-001, AC-007; panel stays up with an approved wording's reason: AC-006), `claims-client.test.ts` and `claims.service.test.ts` (reason queued, sent and stored), admin `claims.service.test.ts` (first reason on the group, owner's text saved with the wording, kept on a later approval, nothing written for an already-accepted wording: AC-002 to AC-005), `admin-screen.test.tsx` (card shows the reason; approve dialog prefilled, edited text sent; empty dialog for a learner claim: AC-002, AC-003), `translate.test.ts` (matched wording explains, own English never: AC-006, AC-008), `schema.test.ts` (explanations only for accepted wordings), `scripts/claims.test.ts` (the CLI keeps explanations when it adds a wording).
- Local D1: migration `0013_claim_explanations.sql` applied. `pnpm content:publish --local --dry-run`: 24569 approved items valid, nothing to change.
- Not checked in a browser: the admin page and a translate run need a signed-in admin and learner.

## Audit

- 2026-11-12: Goal 1 holds (the card shows the AI's reason and the owner edits it before approving: admin tests). Goal 2 holds (a learner matching an approved wording sees its reason, and the claimant sees it at once: grader and runner tests). Success criteria: the chain from AI verdict to claim, card, approval and a later learner is covered piece by piece in unit tests, not in one end-to-end run; gates pass apart from the unrelated home page test.
