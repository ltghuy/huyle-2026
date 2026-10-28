---
id: 008
feature: irregular-verbs
created: 2026-10-28
---

# Technical Design: Irregular verbs

## Scope

In: an optional `forms` block on irregular verbs' word items, drafted and
reviewed like other content; IPA and one audio clip per verb from the
existing scripts; the `/irregular-verbs` page; three forms exercise kinds; a
`forms:` review card; links from grammar and word pages; a forms count in
Hồ sơ; snapshot version 2; the word "sting" (B2).
Out: a new content kind; regular verbs; the daily lesson plan.

## Research Summary

- Codebase only. Verbs are word items (`content/word/{level}.json`) with `pos: "verb"`; 107 of the 108 common irregular verbs exist (A1 60, A2 23, B1 20, B2 4).
- Content flows draft → review (`content:review approve`) → `content:ipa` → `content:audio generate|deploy` → `content:publish`; `publish-content.ts` validates bodies with the Zod schemas in `src/content/schema.ts`.
- Card ids are typed `word:` / `grammar:` (`CardItemId`), used in `snapshot.ts` (Zod), `record.ts` (`isCardId`), `prepare.ts` and `lesson-plan.ts` (`reviewExercises`); hard words only read `word:`.
- `parseSnapshot` already refuses a newer `version` with `newer-version`, which the UI explains; older versions migrate up in a loop.

## Patterns & Reuse

### Conventions to Follow

- Content shape changes go in `src/content/schema.ts`, shared by the app, the API and the scripts; new fields are optional so existing items stay valid.
- Exercise kinds: a pure builder and grader in `src/learning/exercises/{kind}.ts` with tests, a view in `src/components/exercise/`, an entry in `registry.tsx`, and the kind in `EXERCISE_KINDS` (stats count it automatically).
- Pages are static shells; data comes from the content cache (feature 005).

### Existing Code to Reuse

- `useAllWords` (all levels' words, cached) for the page's list; `useContentIndex` for practice and review.
- Typing grading and typo tolerance from `recall` / `listening` typing; option lists from `mcq`; `AudioButton`.
- `ExerciseRun` (score, `retryWrong`) for practice; `reviewExercises` rotation for review kinds.
- `build-ipa.ts` lookups (CMUdict) for the forms; `generate-audio.ts` jobs for one more text per verb.

## Data Model

### Entities

#### `forms` items (one per irregular verb; was planned as a word body field)

```ts
body: {
  wordId: string;     // "word:go-v"; the item id is "forms:go-v", its level the word's
  past: { text: string; ipa: string; region?: "us" | "uk" }[];        // ≥1, first = most common
  participle: { text: string; ipa: string; region?: "us" | "uk" }[];  // ≥1
  noteVi?: string;    // other uses: "hang (treo cổ) → hanged"
  audio: audioKey;    // one clip: "go, went, gone"; "" until generated
  practice: { en: string; answer: "past" | "participle"; vi: string }[]; // ≥2 sentences with "___", for the sentence exercise
}
```

The pattern (AAA, ABB, ABA, ABC) is computed from the first form of each, not stored.

#### Review card `forms:{word slug}`

`CardItemId` gains `` `forms:${string}` ``; `forms:go-v` belongs to `word:go-v`. Scheduled with the same FSRS as other cards.

### Relationships

`forms:X` ↔ `word:X`: same slug, separate schedules (AC-008).

### API Contracts

None new: `forms` travels inside word items through `/api/content/items`.

### Currently Exposed Fields

Unchanged.

## Decisions

| Decision | Rationale |
|----------|-----------|
| A `forms` content kind (`forms:<word slug>`) that references its word (revised 2026-10-28; first planned as a field on the word item) | Approved words can't take a new field without re-review: drafting skips approved items, so forms need their own draft/approved status. A kind gets that from the existing pipeline (draft import, review sheet, publish, content API) with small additions; D1 stores `kind` as plain text, so no migration. The item id doubles as the review card id. Loaded in one request for all levels, like grammar |
| Separate `forms:` card | Owner decision; meaning and forms are different skills |
| Pattern computed, not stored | One source of truth; can't drift from the forms |
| Snapshot version 2 | A `forms:` card in a backup must not reach an app that can't read it; v1 parses into v2 unchanged (AC-015) |
| Listening = choose the correctly spelled set | Owner chose one clip per verb; distractors come from regularised forms (goed), swapped past/participle and near spellings (thought/taught) |
| Not in the daily lesson | Keeps the 15-minute budget; forms come back through Ôn tập |
| `sting` added as a normal B2 word | Owner decision; drafted and reviewed like any word |

## Component Design

- `src/content/schema.ts`: `formsSchema`, optional on `wordBodySchema`.
- `src/learning/verbs.ts`: `patternOf`, `formsCardId`, `acceptedForms`, `listeningDistractors`.
- `src/learning/exercises/forms-typing.ts`, `forms-gap.ts`, `forms-listening.ts` (+ tests); kinds added to `EXERCISE_KINDS`.
- `src/lib/session/prepare.ts`, `src/learning/lesson-plan.ts` (`reviewExercises`): `forms:` cards get forms kinds.
- `src/lib/session/record.ts`, `src/learning/types.ts`, `src/learning/snapshot.ts`: the new card id, snapshot v2.
- `src/app/(app)/irregular-verbs/page.tsx` + `src/components/verbs/` (table, filters, verb dialog, practice sets).
- `src/components/shell/nav.ts`: menu item; grammar topic and word dialog links; Hồ sơ count.
- Scripts: `build-ipa.ts` and `generate-audio.ts` handle `forms`; drafts in `content/.drafts/manual/forms-*.json` imported with `content:draft import`.

## Visual Design Considerations

Direction from `ui-ux-pro-max` (2026-10-28): a semantic shadcn `Table` from `md` up, cards on phones (no horizontal scroll), 44px targets. Built: header "Động từ bất quy tắc"; search (any form, or the meaning without accents); level tabs Tất cả, A1–B2; pattern chips with a one-line hint; a count and "Luyện tập" for the current filter (sets of 10, rotating type V2, choose the form, type V3, listen); the verb dialog (forms with IPA and US/UK tags, note, the two practice sentences filled in, "Luyện động từ này", a link to the word). Level, pattern and the open verb live in the address. The page reads every level's words through the shared `useAllWords` cache plus one forms request. First plan: header "Động từ bất quy tắc", pattern chips (Tất cả, A–A–A, A–B–B, A–B–A, A–B–C) with a one-line Vietnamese explanation, level tabs as in Từ vựng, search; a three-column table on desktop (base · past · participle, meaning under the base, play button), cards on phones; a "Luyện tập" button for the current filter.

## Data Flow

Content: draft → review → IPA → audio (`"go, went, gone"`) → publish → `/api/content/items` → content cache → page. Practice: page filter → steps of the three kinds → `ExerciseRun` → `recordOutcome` on `forms:` cards → Ôn tập.

## Requirements Traceability

| AC | Where |
|----|-------|
| AC-001–AC-006 | page, `verbs.ts`, schema |
| AC-007, AC-010, AC-011 | forms exercises, `ExerciseRun` |
| AC-008, AC-009 | `forms:` card, `record.ts`, `reviewExercises`, `prepare.ts` |
| AC-012, AC-013 | grammar topic links, word dialog |
| AC-014, AC-015 | snapshot v2 |
| AC-016 | Hồ sơ progress |

## Test Strategy

### Infrastructure

Vitest with fixtures in `src/learning/exercises/fixtures.ts`; component tests with `@/test-utils/render`; the e2e fixture content (`scripts/fixtures/content`) gets two irregular verbs.

### Reference Tests

`src/learning/exercises/recall.test.ts`, `mcq.test.ts`; `src/components/vocabulary/vocabulary-browser.test.tsx`; `src/learning/snapshot.test.ts`.

### New Tests

Schema accepts/refuses `forms`; `patternOf` for all four patterns and variants; each forms kind builds, grades (variants, typos) and produces valid distractors; `forms:` cards record and review separately from `word:`; snapshot v1 → v2 and refusing v3; the page filters, searches and starts practice; e2e opens the page and practises.

## Considerations

### Error Handling

The page uses the content error and retry; a missing clip hides the play button and skips listening.

### Security

None new: public content only.

## Open Questions

None.
