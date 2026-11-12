---
id: 042
feature: claim-explanations
created: 2026-11-12
---

# Technical Design: Explanations for approved wordings

## Scope

In scope: the AI prompt for correct answers, the claim from browser to D1, the admin card and approve dialog, the wording content schema, the translate grader and the result panel. Out of scope: Arena, CLI review sheet, explanations for reference answers (spec).

## Research Summary

No new technology. Facts from the code:

- The verdict prompt asks for `explanationVi` only when wrong and `parseVerdict` blanks it when right (src/learning/exercises/translate-ai.ts:74, 144).
- `gradeByAi` submits the claim with `source: "ai"` and drops the verdict's text (src/components/exercise/exercise-runner.tsx:180-181).
- Claims are queued in IndexedDB (`StoredClaim`) and part of the progress snapshot (src/learning/snapshot.ts:158), whose Zod object strips unknown keys, so an extra optional field doesn't break older apps.
- Approving writes the sentence's `wording` item through `writeItemStatements`, marked edited for `content:pull` (src/server/admin/claims.service.ts:110-123).
- The result panel already prints `result.explanationVi` for any result (src/components/exercise/feedback-panel.tsx:70).

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Content shape | Zod in `src/content/schema.ts`, shared by scripts, API and app | A side table for content | src/content/schema.ts:131 |
| Migrations | drizzle-kit `generate` | Hand-written SQL | migrations/ |
| Admin decisions | `claimDecisionSchema` + `decideClaims` in one batch | Two requests | src/server/admin/claims.service.ts |
| Dialogs | the reject dialog in claims-tab.tsx | A new modal pattern | src/components/admin/claims-tab.tsx |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `answerKeys` | src/learning/exercises/translate.ts | key explanations like accepted answers |
| reject dialog | claims-tab.tsx | same shape for approve |
| `explanationVi` on `GradeResult` | src/learning/exercises/types.ts | carry the reason to the panel |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| `Verdict.explanationVi` | now also set when correct |
| `StoredClaim.aiExplanationVi` / claim body `aiExplanationVi` | the AI's reason, device → server |
| `claims.ai_explanation_vi` (D1, new column, migration `0013`) | kept until decided |
| `AdminClaimGroup.aiExplanationVi` | shown on the card |
| `ClaimDecision.explanationVi` | now also used on approve |
| `wording.body.explanationsVi` (content, new, optional) | `Record<acceptedText, explanationVi>` |
| `TranslateInstance.explanations` | answer key → explanation, for the grader |

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/claims` (existing) | POST | each claim may carry `aiExplanationVi` (≤ 500) | unchanged |
| `/api/admin/claims` (existing) | GET | none | groups now carry `aiExplanationVi: string \| null` |
| `/api/admin/claims/decide` (existing) | POST | `explanationVi` now optional on approve | unchanged |

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | AI reason when correct | translate-ai.ts:74,144 | no (blanked) | must add |
| AC-002 | reason on the card | claims table schema.ts:95 | no | must add column + group field |
| AC-004 | reason with the wording | wording schema schema.ts:131 | no | must add `explanationsVi` |
| AC-006 | reason in the result | GradeResult.explanationVi | yes (wrong answers) | must map from wording |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Explanations live in the wording item's body (`explanationsVi`, keyed by accepted text), not a D1 table | Wordings are content: published, cached, pulled into git and edited in "Nội dung"; a key per text keeps them together and lets the schema check each key is accepted |
| The grader looks the matched answer key up in a key → explanation map built with `answerKeys` | The same normalisation as accepted answers, so any accepted spelling of the wording finds its reason |
| A group shows the first non-empty AI explanation | Claims in a group are the same wording; one reason is enough to edit |
| Approve with an already-accepted wording doesn't touch the item | AC-005; avoids rewriting content for a duplicate |
| Prompt change keeps the same JSON shape | Old parsing code and tests stay valid; only the wording of the instruction and the blanking change |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Prompt and parse | src/learning/exercises/translate-ai.ts | modify | reason for correct answers too |
| Runner | src/components/exercise/exercise-runner.tsx | modify | show it (AC-007), send it with the claim |
| Claims client / types / snapshot | src/claims/claims-client.ts, src/learning/types.ts, src/learning/snapshot.ts | modify | carry `aiExplanationVi` |
| Claim API | src/server/claims/claims.schema.ts, claims.service.ts, schema.ts, migration 0013 | modify / new | store it |
| Admin | src/server/admin/admin.schema.ts, claims.service.ts, src/components/admin/claims-tab.tsx | modify | show, edit, save |
| Wording schema | src/content/schema.ts | modify | `explanationsVi` + key check |
| Grader | src/learning/exercises/translate.ts, src/lib/session/content-index.ts, prepare.ts | modify | explanation on a matched wording |

## Data Flow

1. AI says correct with a reason → result shows it; claim queued with `aiExplanationVi` → POST /api/claims → `claims.ai_explanation_vi`.
2. Admin GET groups → card shows reason → "Duyệt" dialog (prefilled) → decide with `explanationVi` → wording item `accepted` + `explanationsVi[answer]`.
3. Content API serves the wording → content index keeps explanations → `buildTranslate` maps keys → `gradeTranslate` adds `explanationVi` → panel.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | prompt, runner, client, API | translate-ai.ts, exercise-runner.tsx, claims-client.ts, claims.* | Planned |
| AC-002 | admin group + card | admin claims.service.ts, claims-tab.tsx | Planned |
| AC-003 | approve dialog | claims-tab.tsx, admin.schema.ts | Planned |
| AC-004 | wording explanations | content/schema.ts, admin claims.service.ts | Planned |
| AC-005 | known wording path | admin claims.service.ts | Planned |
| AC-006 | grader | translate.ts, content-index.ts, prepare.ts | Planned |
| AC-007 | runner result | exercise-runner.tsx | Planned |
| AC-008 | grader (reference answers have no entry) | translate.ts | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | Vitest + Testing Library; `sqliteDb()` for D1 |
| Command | `pnpm --filter learn-english test` |
| Location | next to each file |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| prompt/parse | translate-ai.test.ts | reason kept when correct, trimmed, empty allowed |
| grader | translate.test.ts | matched wording → explanation; own English → none |
| wording schema | schema test | key not accepted is refused |
| claim API | claims.service.test.ts | stores and lists `aiExplanationVi` |
| admin service | admin claims.service.test.ts | group shows first reason; approve saves it; known wording untouched |
| admin tab | admin-screen.test.tsx | card shows reason; dialog prefilled; approve sends edited text |
| runner | exercise-runner.test.tsx | AI-correct shows reason and queues it |

## Considerations

### Error Handling

- A missing or empty reason is simply absent everywhere.

### Security

- The reason is AI output from the learner's own key, stored and shown to the owner first; learners other than the claimant see it only after the owner approves (and may edit) it. Rendered as text, never HTML.

## Open Questions

- [ ] None
